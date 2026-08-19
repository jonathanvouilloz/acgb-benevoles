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
 * Liste publique des tournois **publiés** (accès libre, même non connecté). On expose le nom de
 * l'organisateur (déjà visible sur la page d'inscription) mais aucune donnée de contact.
 * Tri : plus récents d'abord ; la phase est calculée pour le regroupement côté page.
 *
 * Les brouillons sont exclus ici et **ici seulement** : leur lien de partage reste fonctionnel,
 * c'est ce qui permet à un organisateur de tester son tournoi avant de l'ouvrir à tous.
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
		.where(eq(tournament.published, true))
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
			instructions: input.instructions?.length ? input.instructions : null,
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
				orderBy: (position, { asc }) => [asc(position.name)],
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
			instructions: input.instructions?.length ? input.instructions : null,
			startDate: new Date(input.startDate),
			endDate: new Date(input.endDate)
		})
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning();
	return row ?? null;
}

/**
 * Publie ou repasse en brouillon (scellé sur l'organisateur, comme `deleteTournament`).
 * Renvoie `true` si la ligne a bien été touchée, `false` si le tournoi n'existe pas ou ne lui
 * appartient pas — l'appelant en fait un 404 plutôt qu'un faux succès.
 */
export async function setPublished(
	id: string,
	organizerId: string,
	published: boolean
): Promise<boolean> {
	const rows = await db
		.update(tournament)
		.set({ published })
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning({ id: tournament.id });
	return rows.length > 0;
}

/** Supprime un tournoi (cascade postes → créneaux → inscriptions). Renvoie `true` si supprimé. */
export async function deleteTournament(id: string, organizerId: string): Promise<boolean> {
	const rows = await db
		.delete(tournament)
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning({ id: tournament.id });
	return rows.length > 0;
}
