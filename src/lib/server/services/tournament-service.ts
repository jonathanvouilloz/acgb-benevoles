import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { tournament, user } from '$lib/server/db/schema';
import { tournamentPhase, type TournamentPhase } from '$lib/tournament-status';
import type { TournamentInput } from '$lib/schemas/tournament';

export type PublicTournament = {
	id: string;
	name: string;
	location: string | null;
	startDate: Date;
	endDate: Date;
	shareToken: string;
	organizerName: string;
	phase: TournamentPhase;
};

/**
 * Liste publique de TOUS les tournois (accès libre, même non connecté). On expose le nom de
 * l'organisateur (déjà visible sur la page d'inscription) mais aucune donnée de contact.
 * Tri : plus récents d'abord ; la phase est calculée pour le regroupement côté page.
 */
export async function listPublicTournaments(): Promise<PublicTournament[]> {
	const rows = await db
		.select({
			id: tournament.id,
			name: tournament.name,
			location: tournament.location,
			startDate: tournament.startDate,
			endDate: tournament.endDate,
			shareToken: tournament.shareToken,
			organizerName: user.name
		})
		.from(tournament)
		.innerJoin(user, eq(tournament.organizerId, user.id))
		.orderBy(desc(tournament.startDate));

	const now = new Date();
	return rows.map((r) => ({ ...r, phase: tournamentPhase(r.startDate, r.endDate, now) }));
}

/** Génère un `share_token` court et unique (anti-collision sur la contrainte d'unicité). */
async function generateUniqueShareToken(): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const token = nanoid(10);
		const existing = await db
			.select({ id: tournament.id })
			.from(tournament)
			.where(eq(tournament.shareToken, token))
			.limit(1);
		if (existing.length === 0) return token;
	}
	throw new Error('Impossible de générer un lien de partage unique.');
}

/** Crée un tournoi pour l'organisateur et renvoie la ligne créée. */
export async function createTournament(organizerId: string, input: TournamentInput) {
	const shareToken = await generateUniqueShareToken();
	const [row] = await db
		.insert(tournament)
		.values({
			name: input.name,
			location: input.location?.length ? input.location : null,
			startDate: new Date(input.startDate),
			endDate: new Date(input.endDate),
			organizerId,
			shareToken
		})
		.returning();
	return row;
}

/** Liste les tournois d'un organisateur (plus récents en premier). */
export async function listTournamentsByOrganizer(organizerId: string) {
	return db
		.select()
		.from(tournament)
		.where(eq(tournament.organizerId, organizerId))
		.orderBy(desc(tournament.startDate));
}

/**
 * Charge un tournoi appartenant à l'organisateur, avec ses postes et créneaux imbriqués
 * (pour la page de gestion). Renvoie `null` si introuvable ou non-propriétaire.
 */
export async function getTournamentForOrganizer(id: string, organizerId: string) {
	const row = await db.query.tournament.findFirst({
		where: and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)),
		with: {
			positions: {
				orderBy: (position, { asc }) => [asc(position.createdAt)],
				with: {
					shifts: {
						orderBy: (shift, { asc }) => [asc(shift.startsAt)]
					}
				}
			}
		}
	});
	return row ?? null;
}

/** Met à jour un tournoi (scellé sur l'organisateur). Renvoie la ligne ou `null` si non-propriétaire. */
export async function updateTournament(id: string, organizerId: string, input: TournamentInput) {
	const [row] = await db
		.update(tournament)
		.set({
			name: input.name,
			location: input.location?.length ? input.location : null,
			startDate: new Date(input.startDate),
			endDate: new Date(input.endDate)
		})
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning();
	return row ?? null;
}

/** Supprime un tournoi (cascade postes → créneaux → inscriptions). Renvoie `true` si supprimé. */
export async function deleteTournament(id: string, organizerId: string): Promise<boolean> {
	const rows = await db
		.delete(tournament)
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning({ id: tournament.id });
	return rows.length > 0;
}
