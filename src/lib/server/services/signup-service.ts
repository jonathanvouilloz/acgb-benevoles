import { and, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shift, position, tournament, signup } from '$lib/server/db/schema';
import type { SignupStatus } from '$lib/schemas/signup';

/**
 * Couche métier de l'inscription bénévole (page publique /t/[token]).
 *
 * Règle de capacité (cf. PRD) : seules les inscriptions `available` consomment une place ;
 * les `maybe` sont affichées mais ne réservent rien. La limite est appliquée de façon
 * **atomique** (INSERT/UPDATE conditionnel en une requête) : le driver neon-http ne
 * supporte pas les transactions interactives, donc on évite toute fenêtre read-then-write
 * qui permettrait de dépasser la capacité sur la dernière place.
 */

/**
 * Une inscription telle qu'affichée côté bénévole (nom visible — décision produit).
 * `phone` et la `note` d'autrui ne sont remplis **que** pour la vue organisateur
 * (`organizerView`) — jamais exposés côté bénévole (`/t/[token]`). Côté public, un bénévole
 * ne voit que sa propre note.
 */
export type VolunteerSignup = {
	userId: string;
	name: string;
	status: SignupStatus;
	phone: string | null;
	note: string | null;
};

/** Coordonnées de l'organisateur, exposées aux bénévoles (depuis son compte). */
export type TournamentOrganizer = { name: string; email: string; phone: string | null };

export type VolunteerShift = {
	id: string;
	startsAt: Date;
	endsAt: Date;
	capacity: number;
	availableCount: number;
	maybeCount: number;
	remaining: number;
	isFull: boolean;
	signups: VolunteerSignup[];
	myStatus: SignupStatus | null;
	myNote: string | null;
};

export type VolunteerPosition = {
	id: string;
	name: string;
	description: string | null;
	color: string;
	shifts: VolunteerShift[];
};

export type VolunteerTournament = {
	id: string;
	name: string;
	location: string | null;
	startDate: Date;
	endDate: Date;
	shareToken: string;
	organizer: TournamentOrganizer;
	positions: VolunteerPosition[];
};

/** Détecte une violation de la contrainte d'unicité (shift_id + user_id). */
function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false;
	const code = (err as { code?: string }).code;
	const message = (err as { message?: string }).message ?? '';
	return code === '23505' || message.includes('signup_shift_user_unique');
}

/**
 * Charge un tournoi (postes → créneaux → inscrits) selon une condition arbitraire.
 * Centralise l'arborescence `with` et son type de retour (cf. `TournamentRow`).
 */
function findTournamentRow(where: SQL) {
	return db.query.tournament.findFirst({
		where,
		with: {
			organizer: { columns: { name: true, email: true, phone: true } },
			positions: {
				orderBy: (p, { asc }) => [asc(p.createdAt)],
				with: {
					shifts: {
						orderBy: (s, { asc }) => [asc(s.startsAt)],
						with: {
							signups: {
								orderBy: (su, { asc }) => [asc(su.createdAt)],
								with: { user: { columns: { id: true, name: true, phone: true } } }
							}
						}
					}
				}
			}
		}
	});
}

/** Type du `row` retourné par `findTournamentRow` (entièrement inféré par Drizzle). */
type TournamentRow = NonNullable<Awaited<ReturnType<typeof findTournamentRow>>>;

/**
 * Mappe une ligne tournoi (postes → créneaux → inscrits) vers `VolunteerTournament`.
 * Calcule par créneau les compteurs (available/maybe/remaining/isFull) et le statut de
 * `userId` (`myStatus`, `null` si non fourni — ex. vue organisateur).
 *
 * `organizerView` (défaut `false`) : expose le téléphone ET les notes de tous les inscrits.
 * Côté bénévole on ne divulgue jamais les numéros ni les notes des autres — seule la note de
 * `userId` (sa propre inscription) lui revient.
 */
function mapTournamentRow(
	row: TournamentRow,
	userId: string | null,
	{ organizerView = false }: { organizerView?: boolean } = {}
): VolunteerTournament {
	return {
		id: row.id,
		name: row.name,
		location: row.location,
		startDate: row.startDate,
		endDate: row.endDate,
		shareToken: row.shareToken,
		organizer: {
			name: row.organizer.name,
			email: row.organizer.email,
			phone: row.organizer.phone
		},
		positions: row.positions.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			color: p.color,
			shifts: p.shifts.map((s) => {
				const signups: VolunteerSignup[] = s.signups.map((su) => ({
					userId: su.userId,
					name: su.user.name,
					status: su.status,
					phone: organizerView ? su.user.phone : null,
					// Note : visible pour l'orga (toutes) ou pour son propriétaire (vue publique).
					note: organizerView || su.userId === userId ? su.note : null
				}));
				const availableCount = signups.filter((x) => x.status === 'available').length;
				const maybeCount = signups.filter((x) => x.status === 'maybe').length;
				const mine = userId ? signups.find((x) => x.userId === userId) : undefined;
				return {
					id: s.id,
					startsAt: s.startsAt,
					endsAt: s.endsAt,
					capacity: s.capacity,
					availableCount,
					maybeCount,
					remaining: Math.max(0, s.capacity - availableCount),
					isFull: availableCount >= s.capacity,
					signups,
					myStatus: mine ? mine.status : null,
					myNote: mine ? mine.note : null
				};
			})
		}))
	};
}

/**
 * Lecture publique d'un tournoi via son `share_token`, avec postes, créneaux et inscrits.
 * Calcule par créneau les compteurs (available/maybe/remaining/isFull) et le statut de
 * l'utilisateur courant (`myStatus`). Retourne `null` si le token est inconnu (→ 404).
 */
export async function getTournamentByShareToken(
	shareToken: string,
	userId: string | null
): Promise<VolunteerTournament | null> {
	const row = await findTournamentRow(eq(tournament.shareToken, shareToken));
	return row ? mapTournamentRow(row, userId) : null;
}

/**
 * Lecture du suivi d'un tournoi côté **organisateur** (vue lecture seule `/tournois/[id]/suivi`).
 * Même structure que la lecture publique mais gardée par l'ownership : retourne `null` si le
 * tournoi est inconnu **ou** n'appartient pas à `organizerId`. `myStatus` est toujours `null`
 * (l'organisateur n'est pas un bénévole sur cette vue).
 */
export async function getTournamentSignupsForOrganizer(
	tournamentId: string,
	organizerId: string
): Promise<VolunteerTournament | null> {
	const row = await findTournamentRow(
		and(eq(tournament.id, tournamentId), eq(tournament.organizerId, organizerId))!
	);
	return row ? mapTournamentRow(row, null, { organizerView: true }) : null;
}

/** Une carte « Mes inscriptions » : un tournoi où le bénévole est inscrit + son prochain créneau. */
export type MyTournamentCard = {
	id: string;
	name: string;
	location: string | null;
	startDate: Date;
	endDate: Date;
	shareToken: string;
	signupCount: number;
	nextShift: {
		startsAt: Date;
		endsAt: Date;
		positionName: string;
		positionColor: string;
		status: SignupStatus;
	} | null;
};

/**
 * Tournois auxquels l'utilisateur s'est inscrit (accueil bénévole « Mes inscriptions »).
 * Regroupe ses inscriptions par tournoi et calcule, par tournoi, le prochain créneau à venir.
 * Tri : tournois avec un créneau à venir en premier (par proximité), puis les autres par date.
 */
export async function getMyTournaments(userId: string): Promise<MyTournamentCard[]> {
	const rows = await db.query.signup.findMany({
		where: eq(signup.userId, userId),
		with: { shift: { with: { position: { with: { tournament: true } } } } }
	});

	const now = Date.now();
	const byTournament = new Map<string, MyTournamentCard>();

	for (const su of rows) {
		const sh = su.shift;
		const pos = sh.position;
		const tour = pos.tournament;
		let card = byTournament.get(tour.id);
		if (!card) {
			card = {
				id: tour.id,
				name: tour.name,
				location: tour.location,
				startDate: tour.startDate,
				endDate: tour.endDate,
				shareToken: tour.shareToken,
				signupCount: 0,
				nextShift: null
			};
			byTournament.set(tour.id, card);
		}
		card.signupCount += 1;
		if (sh.startsAt.getTime() > now) {
			if (!card.nextShift || sh.startsAt.getTime() < card.nextShift.startsAt.getTime()) {
				card.nextShift = {
					startsAt: sh.startsAt,
					endsAt: sh.endsAt,
					positionName: pos.name,
					positionColor: pos.color,
					status: su.status
				};
			}
		}
	}

	return [...byTournament.values()].sort((a, b) => {
		const an = a.nextShift?.startsAt.getTime() ?? Infinity;
		const bn = b.nextShift?.startsAt.getTime() ?? Infinity;
		return an - bn || a.startDate.getTime() - b.startDate.getTime();
	});
}

/** Une ligne de l'agenda bénévole : un créneau où l'utilisateur est inscrit, avec son tournoi. */
export type MyAgendaShift = {
	shiftId: string;
	startsAt: Date;
	endsAt: Date;
	status: SignupStatus;
	positionName: string;
	positionColor: string;
	tournamentName: string;
	shareToken: string;
};

/**
 * Tous les créneaux **à venir** où l'utilisateur est inscrit, tous tournois confondus
 * (agenda global de l'accueil bénévole « Mes créneaux »). À venir = `endsAt > now`
 * (cohérent avec `splitByTime`). Triés par heure de début croissante.
 */
export async function getMyUpcomingShifts(userId: string): Promise<MyAgendaShift[]> {
	const rows = await db.query.signup.findMany({
		where: eq(signup.userId, userId),
		with: { shift: { with: { position: { with: { tournament: true } } } } }
	});

	const now = Date.now();
	const out: MyAgendaShift[] = [];

	for (const su of rows) {
		const sh = su.shift;
		if (sh.endsAt.getTime() <= now) continue;
		const pos = sh.position;
		const tour = pos.tournament;
		out.push({
			shiftId: sh.id,
			startsAt: sh.startsAt,
			endsAt: sh.endsAt,
			status: su.status,
			positionName: pos.name,
			positionColor: pos.color,
			tournamentName: tour.name,
			shareToken: tour.shareToken
		});
	}

	return out.sort(
		(a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.endsAt.getTime() - b.endsAt.getTime()
	);
}

/** Charge un créneau + sa capacité (existence). Retourne `null` si introuvable. */
async function getShift(shiftId: string): Promise<{ capacity: number } | null> {
	const rows = await db
		.select({ capacity: shift.capacity })
		.from(shift)
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(shift.id, shiftId))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Inscrit l'utilisateur sur un créneau.
 * - `maybe` : insertion directe (ne consomme pas de place).
 * - `available` : insertion conditionnelle atomique (échoue si capacité atteinte).
 * Erreurs : `NOT_FOUND` (créneau inexistant), `FULL` (complet), `DUPLICATE` (déjà inscrit).
 */
export async function createSignup(
	shiftId: string,
	userId: string,
	status: SignupStatus,
	note?: string
): Promise<void> {
	const s = await getShift(shiftId);
	if (!s) throw new Error('NOT_FOUND');
	const noteValue = note ?? null;

	try {
		if (status === 'maybe') {
			await db.insert(signup).values({ shiftId, userId, status: 'maybe', note: noteValue });
			return;
		}

		// `available` : on insère seulement si le nombre d'available reste sous la capacité.
		const res = await db.execute(sql`
			INSERT INTO signup (shift_id, user_id, status, note)
			SELECT ${shiftId}::uuid, ${userId}, 'available', ${noteValue}
			WHERE (
				SELECT count(*) FROM signup
				WHERE shift_id = ${shiftId}::uuid AND status = 'available'
			) < ${s.capacity}
			RETURNING id
		`);
		if (res.rows.length === 0) throw new Error('FULL');
	} catch (err) {
		if (isUniqueViolation(err)) throw new Error('DUPLICATE');
		throw err;
	}
}

/**
 * Change le statut de l'inscription existante de l'utilisateur (upsert défensif).
 * - vers `maybe` : libère la place, toujours possible.
 * - vers `available` : re-vérifie la capacité (en excluant la ligne de l'utilisateur) →
 *   `FULL` si plus de place. Si l'utilisateur n'est pas encore inscrit (UI périmée), on
 *   bascule sur `createSignup`.
 * Erreurs : `NOT_FOUND`, `FULL`.
 */
export async function changeSignupStatus(
	shiftId: string,
	userId: string,
	status: SignupStatus,
	note?: string
): Promise<void> {
	const s = await getShift(shiftId);
	if (!s) throw new Error('NOT_FOUND');
	const noteValue = note ?? null;

	const existing = await db
		.select({ status: signup.status })
		.from(signup)
		.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)))
		.limit(1);

	// Pas d'inscription existante → comportement « créer ».
	if (existing.length === 0) {
		await createSignup(shiftId, userId, status, note);
		return;
	}

	if (status === 'maybe') {
		await db
			.update(signup)
			.set({ status: 'maybe', note: noteValue })
			.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
		return;
	}

	// Déjà `available` → on met seulement la note à jour (le statut ne change pas).
	if (existing[0].status === 'available') {
		await db
			.update(signup)
			.set({ note: noteValue })
			.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
		return;
	}

	// Promotion `maybe` → `available` : conditionnelle sur la capacité (hors sa propre ligne).
	const res = await db.execute(sql`
		UPDATE signup SET status = 'available', note = ${noteValue}
		WHERE shift_id = ${shiftId}::uuid AND user_id = ${userId}
			AND (
				SELECT count(*) FROM signup
				WHERE shift_id = ${shiftId}::uuid AND status = 'available' AND user_id <> ${userId}
			) < ${s.capacity}
		RETURNING id
	`);
	if (res.rows.length === 0) throw new Error('FULL');
}

/**
 * Met à jour la seule note de l'inscription de l'utilisateur (sans toucher au statut).
 * Idempotent ; le WHERE filtre sur `user_id` (le bénévole ne touche que sa propre note).
 */
export async function setSignupNote(shiftId: string, userId: string, note?: string): Promise<void> {
	await db
		.update(signup)
		.set({ note: note ?? null })
		.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
}

/**
 * Désinscrit l'utilisateur d'un créneau (idempotent). Le WHERE filtre sur `user_id` :
 * impossible de retirer l'inscription d'autrui. Libère la place au prochain recalcul.
 */
export async function deleteSignup(shiftId: string, userId: string): Promise<void> {
	await db.delete(signup).where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
}

/* ------------------------------------------------------------------ *
 * Édition d'affectations (organisateur) — déplacement & échange.
 * Gardées par l'ownership du tournoi ; concurrence faible (un seul orga
 * édite son propre tournoi) → vérifications lues puis écriture.
 * ------------------------------------------------------------------ */

/** Créneau résolu pour un organisateur : capacité, tournoi parent et nb d'available courant. */
type OrganizerShift = { capacity: number; tournamentId: string; available: number };

/** Charge un créneau si (et seulement si) il appartient à un tournoi de `organizerId`. */
async function getOrganizerShift(
	shiftId: string,
	organizerId: string
): Promise<OrganizerShift | null> {
	const rows = await db
		.select({
			capacity: shift.capacity,
			tournamentId: position.tournamentId,
			available: sql<number>`(
				SELECT count(*)::int FROM signup
				WHERE signup.shift_id = ${shift.id} AND signup.status = 'available'
			)`
		})
		.from(shift)
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(and(eq(shift.id, shiftId), eq(tournament.organizerId, organizerId)))
		.limit(1);
	return rows[0] ?? null;
}

/** Statut de l'inscription (shiftId, userId), ou `null` si elle n'existe pas. */
async function getSignupStatus(shiftId: string, userId: string): Promise<SignupStatus | null> {
	const rows = await db
		.select({ status: signup.status })
		.from(signup)
		.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)))
		.limit(1);
	return rows[0]?.status ?? null;
}

/**
 * Déplace l'inscription `(shiftId, userId)` vers `targetShiftId` (même tournoi).
 * Vérifie l'ownership des deux créneaux, refuse si le bénévole est déjà sur la cible
 * (`DUPLICATE`) ou si la cible est complète pour une inscription `available` (`FULL`).
 * Erreurs : `NOT_FOUND`, `DUPLICATE`, `FULL`.
 */
export async function moveSignup(
	organizerId: string,
	tournamentId: string,
	source: { shiftId: string; userId: string },
	targetShiftId: string
): Promise<void> {
	if (source.shiftId === targetShiftId) return; // no-op

	const src = await getOrganizerShift(source.shiftId, organizerId);
	const tgt = await getOrganizerShift(targetShiftId, organizerId);
	if (!src || !tgt || src.tournamentId !== tournamentId || tgt.tournamentId !== tournamentId) {
		throw new Error('NOT_FOUND');
	}

	const status = await getSignupStatus(source.shiftId, source.userId);
	if (!status) throw new Error('NOT_FOUND');

	if (await getSignupStatus(targetShiftId, source.userId)) throw new Error('DUPLICATE');
	if (status === 'available' && tgt.available >= tgt.capacity) throw new Error('FULL');

	await db
		.update(signup)
		.set({ shiftId: targetShiftId })
		.where(and(eq(signup.shiftId, source.shiftId), eq(signup.userId, source.userId)));
}

/**
 * Échange deux inscriptions entre leurs créneaux (chaque bénévole garde son statut).
 * Vérifie l'ownership, l'absence de doublon croisé, et que la capacité `available` reste
 * respectée des deux côtés (un statut `maybe` ↔ `available` peut faire varier le compte).
 * L'échange est atomique (un seul UPDATE). Erreurs : `NOT_FOUND`, `DUPLICATE`, `FULL`.
 */
export async function swapSignups(
	organizerId: string,
	tournamentId: string,
	a: { shiftId: string; userId: string },
	b: { shiftId: string; userId: string }
): Promise<void> {
	if (a.userId === b.userId) return; // même bénévole : rien à échanger
	if (a.shiftId === b.shiftId) return; // même créneau : pas de déplacement

	const sa = await getOrganizerShift(a.shiftId, organizerId);
	const sb = await getOrganizerShift(b.shiftId, organizerId);
	if (!sa || !sb || sa.tournamentId !== tournamentId || sb.tournamentId !== tournamentId) {
		throw new Error('NOT_FOUND');
	}

	const statusA = await getSignupStatus(a.shiftId, a.userId);
	const statusB = await getSignupStatus(b.shiftId, b.userId);
	if (!statusA || !statusB) throw new Error('NOT_FOUND');

	// Doublon croisé : un bénévole est déjà inscrit sur le créneau de l'autre.
	if (await getSignupStatus(b.shiftId, a.userId)) throw new Error('DUPLICATE');
	if (await getSignupStatus(a.shiftId, b.userId)) throw new Error('DUPLICATE');

	// Capacité résultante (chaque créneau perd son inscrit et gagne l'autre).
	const aAvail = statusA === 'available' ? 1 : 0;
	const bAvail = statusB === 'available' ? 1 : 0;
	if (sa.available - aAvail + bAvail > sa.capacity) throw new Error('FULL');
	if (sb.available - bAvail + aAvail > sb.capacity) throw new Error('FULL');

	// Échange en une seule instruction (pas de violation transitoire d'unicité : les
	// nouvelles paires (shift,user) sont distinctes et ont été vérifiées sans doublon).
	await db.execute(sql`
		UPDATE signup SET shift_id = CASE
			WHEN user_id = ${a.userId} AND shift_id = ${a.shiftId}::uuid THEN ${b.shiftId}::uuid
			WHEN user_id = ${b.userId} AND shift_id = ${b.shiftId}::uuid THEN ${a.shiftId}::uuid
		END
		WHERE (user_id = ${a.userId} AND shift_id = ${a.shiftId}::uuid)
			OR (user_id = ${b.userId} AND shift_id = ${b.shiftId}::uuid)
	`);
}
