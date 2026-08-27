import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { tournament, user } from '$lib/server/db/schema';
import { tournamentPhase, type TournamentPhase } from '$lib/tournament-status';
import type { TournamentInput } from '$lib/schemas/tournament';
import { getActor, logActivity } from './activity-log-service';
import { formatDateRange } from '$lib/format';

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

	await trace(row.id, organizerId, 'create', row.name);

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
	// Lu AVANT l'écriture : le journal dit ce qui a changé, pas seulement qu'il y a eu un changement.
	const before = await db
		.select({
			name: tournament.name,
			location: tournament.location,
			instructions: tournament.instructions,
			startDate: tournament.startDate,
			endDate: tournament.endDate
		})
		.from(tournament)
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.limit(1);

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
	if (!row) return null;

	const changes = describeChanges(before[0], input);
	// Un submit sans modification ne mérite pas d'entrée : le journal doit rester lisible.
	if (changes) await trace(id, organizerId, 'update', changes);

	return row;
}

/** Liste les champs réellement modifiés, en clair. `null` si le formulaire n'a rien changé. */
function describeChanges(
	before:
		| {
				name: string;
				location: string | null;
				instructions: string | null;
				startDate: Date;
				endDate: Date;
		  }
		| undefined,
	input: TournamentInput
): string | null {
	if (!before) return null;
	const changed: string[] = [];
	if (before.name !== input.name) {
		changed.push(`nom : « ${before.name} » → « ${input.name} »`);
	}
	if ((before.location ?? '') !== (input.location ?? '')) changed.push('lieu');
	if ((before.instructions ?? '') !== (input.instructions ?? '')) changed.push('consignes');
	const dates = formatDateRange(new Date(input.startDate), new Date(input.endDate));
	if (
		before.startDate.getTime() !== new Date(input.startDate).getTime() ||
		before.endDate.getTime() !== new Date(input.endDate).getTime()
	) {
		changed.push(`dates → ${dates}`);
	}
	return changed.length > 0 ? changed.join(', ') : null;
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
	if (rows.length === 0) return false;

	await trace(
		id,
		organizerId,
		published ? 'publish' : 'unpublish',
		published ? 'visible dans le listing public' : 'retiré du listing public'
	);

	return true;
}

/** Supprime un tournoi (cascade postes → créneaux → inscriptions). Renvoie `true` si supprimé. */
export async function deleteTournament(id: string, organizerId: string): Promise<boolean> {
	const rows = await db
		.delete(tournament)
		.where(and(eq(tournament.id, id), eq(tournament.organizerId, organizerId)))
		.returning({ id: tournament.id });
	return rows.length > 0;
}

/**
 * Entrée de journal pour une action sur le tournoi lui-même. Best-effort : `logActivity` avale ses
 * erreurs, et `getActor` a des valeurs de repli — une mutation réussie ne peut pas échouer ici.
 *
 * `deleteTournament` n'appelle PAS ce helper, volontairement : le journal cascade avec le tournoi,
 * la trace de sa suppression n'aurait aucun lecteur.
 */
async function trace(
	tournamentId: string,
	organizerId: string,
	action: 'create' | 'update' | 'publish' | 'unpublish',
	detail: string
): Promise<void> {
	const actor = await getActor(organizerId);
	await logActivity({
		tournamentId,
		targetType: 'tournament',
		action,
		actorId: organizerId,
		actorName: actor.name,
		actorRole: actor.role,
		detail
	});
}
