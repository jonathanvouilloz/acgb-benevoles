import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shift, position, tournament } from '$lib/server/db/schema';
import { toShiftTimestamps, type ShiftInput } from '$lib/schemas/shift';
import { formatDay, formatTimeRange } from '$lib/format';
import { scheduleForShift } from './reminder-scheduler';
import { enqueueDigestForShift } from './digest-scheduler';
import { getActor, logActivity } from './activity-log-service';

/**
 * Vérifie qu'un poste appartient à un tournoi de l'organisateur. Throw 'FORBIDDEN' sinon.
 * Retourne le contexte (tournoi + nom du poste) : le journal en a besoin, et il sort de la
 * jointure que cette garde faisait déjà — aucune requête de plus.
 */
async function assertPositionOwner(
	positionId: string,
	organizerId: string
): Promise<{ tournamentId: string; positionName: string }> {
	const rows = await db
		.select({
			organizerId: tournament.organizerId,
			tournamentId: position.tournamentId,
			positionName: position.name
		})
		.from(position)
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(position.id, positionId))
		.limit(1);
	if (rows.length === 0 || rows[0].organizerId !== organizerId) throw new Error('FORBIDDEN');
	return { tournamentId: rows[0].tournamentId, positionName: rows[0].positionName };
}

/** Contexte d'un créneau, résolu par la garde d'ownership. */
type ShiftContext = {
	tournamentId: string;
	positionName: string;
	startsAt: Date;
	endsAt: Date;
	capacity: number;
};

/** Vérifie qu'un créneau appartient à un tournoi de l'organisateur. Throw 'FORBIDDEN' sinon. */
async function assertShiftOwner(shiftId: string, organizerId: string): Promise<ShiftContext> {
	const rows = await db
		.select({
			organizerId: tournament.organizerId,
			tournamentId: position.tournamentId,
			positionName: position.name,
			startsAt: shift.startsAt,
			endsAt: shift.endsAt,
			capacity: shift.capacity
		})
		.from(shift)
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(shift.id, shiftId))
		.limit(1);
	if (rows.length === 0 || rows[0].organizerId !== organizerId) throw new Error('FORBIDDEN');
	const r = rows[0];
	return {
		tournamentId: r.tournamentId,
		positionName: r.positionName,
		startsAt: r.startsAt,
		endsAt: r.endsAt,
		capacity: r.capacity
	};
}

/** « Buvette · sam. 10 mai, 10:00 – 14:00 » — libellé figé dans le journal. */
function shiftLabel(positionName: string, startsAt: Date, endsAt: Date): string {
	return `${positionName} · ${formatDay(startsAt)}, ${formatTimeRange(startsAt, endsAt)}`;
}

/** Entrée de journal pour une action sur un créneau. Best-effort (cf. activity-log-service). */
async function trace(
	tournamentId: string,
	organizerId: string,
	action: 'create' | 'update' | 'delete',
	detail: string
): Promise<void> {
	const actor = await getActor(organizerId);
	await logActivity({
		tournamentId,
		targetType: 'shift',
		action,
		actorId: organizerId,
		actorName: actor.name,
		actorRole: actor.role,
		detail
	});
}

/** Crée un créneau sur un poste, en recomposant les timestamps jour + heures. */
export async function createShift(positionId: string, organizerId: string, input: ShiftInput) {
	const ctx = await assertPositionOwner(positionId, organizerId);
	const { startsAt, endsAt } = toShiftTimestamps(input.day, input.startTime, input.endTime);
	const [row] = await db
		.insert(shift)
		.values({ positionId, startsAt, endsAt, capacity: input.capacity })
		.returning();

	const places = `${input.capacity} place${input.capacity > 1 ? 's' : ''}`;
	await trace(
		ctx.tournamentId,
		organizerId,
		'create',
		`${shiftLabel(ctx.positionName, startsAt, endsAt)} · ${places}`
	);

	return row;
}

/** Met à jour un créneau (jour, plage, capacité). */
export async function updateShift(shiftId: string, organizerId: string, input: ShiftInput) {
	const before = await assertShiftOwner(shiftId, organizerId);
	const { startsAt, endsAt } = toShiftTimestamps(input.day, input.startTime, input.endTime);
	const [row] = await db
		.update(shift)
		.set({ startsAt, endsAt, capacity: input.capacity })
		.where(eq(shift.id, shiftId))
		.returning();

	// Le créneau a pu être déplacé → reprogramme les rappels de tous ses inscrits `available`
	// (best-effort ; les anciens messages QStash droppent à leur livraison via `expectedStartsAtMs`).
	if (row) await scheduleForShift(shiftId);

	// Un horaire qui bouge doit être annoncé : sans ça un bénévole se présente à l'ancienne heure.
	if (row) await enqueueDigestForShift(shiftId);
	if (!row) return null;

	const changed: string[] = [];
	if (
		before.startsAt.getTime() !== startsAt.getTime() ||
		before.endsAt.getTime() !== endsAt.getTime()
	) {
		changed.push(`horaire → ${formatDay(startsAt)}, ${formatTimeRange(startsAt, endsAt)}`);
	}
	if (before.capacity !== input.capacity) {
		changed.push(`capacité ${before.capacity} → ${input.capacity}`);
	}
	// Le libellé décrit le créneau AVANT modification : c'est celui que l'organisateur reconnaît.
	if (changed.length > 0) {
		const label = shiftLabel(before.positionName, before.startsAt, before.endsAt);
		await trace(before.tournamentId, organizerId, 'update', `${label} : ${changed.join(', ')}`);
	}

	return row;
}

/** Supprime un créneau (cascade inscriptions). */
export async function deleteShift(shiftId: string, organizerId: string): Promise<void> {
	const ctx = await assertShiftOwner(shiftId, organizerId);

	// AVANT le DELETE : la cascade emporte les inscriptions, après coup il n'y a plus personne à
	// prévenir. Le récap partira 10 min plus tard et reflètera l'état post-suppression.
	await enqueueDigestForShift(shiftId);

	await db.delete(shift).where(eq(shift.id, shiftId));

	await trace(
		ctx.tournamentId,
		organizerId,
		'delete',
		shiftLabel(ctx.positionName, ctx.startsAt, ctx.endsAt)
	);
}
