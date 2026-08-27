import { eq, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { position, shift, tournament } from '$lib/server/db/schema';
import { assignPosteColor } from '$lib/poste-colors';
import type { PositionInput } from '$lib/schemas/position';
import { assertTournamentOwner } from './ownership';
import { getActor, logActivity } from './activity-log-service';

/** Contexte d'un poste, résolu par la garde d'ownership (les jointures étaient déjà là). */
type PositionContext = { tournamentId: string; name: string; description: string | null };

/**
 * Vérifie qu'un poste appartient à un tournoi de l'organisateur. Throw 'FORBIDDEN' sinon.
 *
 * Retourne le contexte du poste plutôt que `void` : le journal a besoin du `tournamentId` et du
 * libellé, et les deux sortent de la jointure que cette garde faisait déjà — aucune requête de plus.
 */
async function assertPositionOwner(
	positionId: string,
	organizerId: string
): Promise<PositionContext> {
	const rows = await db
		.select({
			organizerId: tournament.organizerId,
			tournamentId: position.tournamentId,
			name: position.name,
			description: position.description
		})
		.from(position)
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(position.id, positionId))
		.limit(1);
	if (rows.length === 0 || rows[0].organizerId !== organizerId) throw new Error('FORBIDDEN');
	return {
		tournamentId: rows[0].tournamentId,
		name: rows[0].name,
		description: rows[0].description
	};
}

/** Entrée de journal pour une action sur un poste. Best-effort (cf. activity-log-service). */
async function trace(
	tournamentId: string,
	organizerId: string,
	action: 'create' | 'update' | 'delete',
	detail: string
): Promise<void> {
	const actor = await getActor(organizerId);
	await logActivity({
		tournamentId,
		targetType: 'position',
		action,
		actorId: organizerId,
		actorName: actor.name,
		actorRole: actor.role,
		detail
	});
}

/** Crée un poste dans un tournoi de l'organisateur, avec couleur auto-assignée. */
export async function createPosition(
	tournamentId: string,
	organizerId: string,
	input: PositionInput
) {
	await assertTournamentOwner(tournamentId, organizerId);

	const [{ value: existing }] = await db
		.select({ value: count() })
		.from(position)
		.where(eq(position.tournamentId, tournamentId));

	const [row] = await db
		.insert(position)
		.values({
			tournamentId,
			name: input.name,
			description: input.description?.length ? input.description : null,
			color: assignPosteColor(existing)
		})
		.returning();

	await trace(tournamentId, organizerId, 'create', `« ${row.name} »`);

	return row;
}

/** Met à jour le nom / la description d'un poste (la couleur reste figée). */
export async function updatePosition(
	positionId: string,
	organizerId: string,
	input: PositionInput
) {
	const before = await assertPositionOwner(positionId, organizerId);
	const [row] = await db
		.update(position)
		.set({
			name: input.name,
			description: input.description?.length ? input.description : null
		})
		.where(eq(position.id, positionId))
		.returning();
	if (!row) return null;

	const changed: string[] = [];
	if (before.name !== input.name) changed.push(`renommé « ${before.name} » → « ${input.name} »`);
	if ((before.description ?? '') !== (input.description ?? '')) changed.push('consignes modifiées');
	// Un submit qui ne change rien ne mérite pas d'entrée.
	if (changed.length > 0) {
		await trace(
			before.tournamentId,
			organizerId,
			'update',
			`« ${row.name} » : ${changed.join(', ')}`
		);
	}

	return row;
}

/** Supprime un poste (cascade créneaux → inscriptions). */
export async function deletePosition(positionId: string, organizerId: string): Promise<void> {
	const ctx = await assertPositionOwner(positionId, organizerId);

	// Compté AVANT le DELETE : après la cascade, plus rien ne dit ce que la suppression a emporté.
	const [{ value: shifts }] = await db
		.select({ value: count() })
		.from(shift)
		.where(eq(shift.positionId, positionId));

	await db.delete(position).where(eq(position.id, positionId));

	const emported =
		shifts > 0
			? ` (${shifts} créneau${shifts > 1 ? 'x' : ''} supprimé${shifts > 1 ? 's' : ''})`
			: '';
	await trace(ctx.tournamentId, organizerId, 'delete', `« ${ctx.name} »${emported}`);
}
