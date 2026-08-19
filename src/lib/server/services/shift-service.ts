import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shift, position, tournament } from '$lib/server/db/schema';
import { toShiftTimestamps, type ShiftInput } from '$lib/schemas/shift';
import { scheduleForShift } from './reminder-scheduler';
import { enqueueDigestForShift } from './digest-scheduler';

/** Vérifie qu'un poste appartient à un tournoi de l'organisateur. Throw 'FORBIDDEN' sinon. */
async function assertPositionOwner(positionId: string, organizerId: string): Promise<void> {
	const rows = await db
		.select({ organizerId: tournament.organizerId })
		.from(position)
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(position.id, positionId))
		.limit(1);
	if (rows.length === 0 || rows[0].organizerId !== organizerId) throw new Error('FORBIDDEN');
}

/** Vérifie qu'un créneau appartient à un tournoi de l'organisateur. Throw 'FORBIDDEN' sinon. */
async function assertShiftOwner(shiftId: string, organizerId: string): Promise<void> {
	const rows = await db
		.select({ organizerId: tournament.organizerId })
		.from(shift)
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(shift.id, shiftId))
		.limit(1);
	if (rows.length === 0 || rows[0].organizerId !== organizerId) throw new Error('FORBIDDEN');
}

/** Crée un créneau sur un poste, en recomposant les timestamps jour + heures. */
export async function createShift(positionId: string, organizerId: string, input: ShiftInput) {
	await assertPositionOwner(positionId, organizerId);
	const { startsAt, endsAt } = toShiftTimestamps(input.day, input.startTime, input.endTime);
	const [row] = await db
		.insert(shift)
		.values({ positionId, startsAt, endsAt, capacity: input.capacity })
		.returning();
	return row;
}

/** Met à jour un créneau (jour, plage, capacité). */
export async function updateShift(shiftId: string, organizerId: string, input: ShiftInput) {
	await assertShiftOwner(shiftId, organizerId);
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

	return row ?? null;
}

/** Supprime un créneau (cascade inscriptions). */
export async function deleteShift(shiftId: string, organizerId: string): Promise<void> {
	await assertShiftOwner(shiftId, organizerId);

	// AVANT le DELETE : la cascade emporte les inscriptions, après coup il n'y a plus personne à
	// prévenir. Le récap partira 10 min plus tard et reflètera l'état post-suppression.
	await enqueueDigestForShift(shiftId);

	await db.delete(shift).where(eq(shift.id, shiftId));
}
