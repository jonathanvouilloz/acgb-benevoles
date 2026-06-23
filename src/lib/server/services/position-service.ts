import { and, eq, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { position, tournament } from '$lib/server/db/schema';
import { assignPosteColor } from '$lib/poste-colors';
import type { PositionInput } from '$lib/schemas/position';

/** Vérifie que le tournoi appartient bien à l'organisateur. Throw 'FORBIDDEN' sinon. */
async function assertTournamentOwner(tournamentId: string, organizerId: string): Promise<void> {
	const rows = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.organizerId, organizerId)))
		.limit(1);
	if (rows.length === 0) throw new Error('FORBIDDEN');
}

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
	return row;
}

/** Met à jour le nom / la description d'un poste (la couleur reste figée). */
export async function updatePosition(
	positionId: string,
	organizerId: string,
	input: PositionInput
) {
	await assertPositionOwner(positionId, organizerId);
	const [row] = await db
		.update(position)
		.set({
			name: input.name,
			description: input.description?.length ? input.description : null
		})
		.where(eq(position.id, positionId))
		.returning();
	return row ?? null;
}

/** Supprime un poste (cascade créneaux → inscriptions). */
export async function deletePosition(positionId: string, organizerId: string): Promise<void> {
	await assertPositionOwner(positionId, organizerId);
	await db.delete(position).where(eq(position.id, positionId));
}
