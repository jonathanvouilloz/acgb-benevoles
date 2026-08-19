import { and, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shift, position, tournament, signup, user } from '$lib/server/db/schema';
import type { SignupStatus } from '$lib/schemas/signup';
import { formatDay, formatTime } from '$lib/format';
import { scheduleForSignup } from './reminder-scheduler';
import { notifyUser, type PushPayload } from './push-service';
import { logAssignment } from './assignment-log-service';
import { createManagedVolunteer } from './volunteer-directory';
import type { AssignInput } from '$lib/schemas/assignment';

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
	/**
	 * Fiche créée par un organisateur, sans email réel : ne se connecte pas, ne reçoit aucun
	 * rappel. Exposé **uniquement** en vue organisateur — sans ce marqueur, l'organisateur croit
	 * que la personne a été prévenue comme les autres.
	 */
	isManaged: boolean;
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
	/** Consignes libres de l'organisateur, affichées en tête de la page d'inscription. */
	instructions: string | null;
	startDate: Date;
	endDate: Date;
	shareToken: string;
	/** L'utilisateur courant est-il l'organisateur (propriétaire) de ce tournoi ? */
	isOwner: boolean;
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
				orderBy: (p, { asc }) => [asc(p.name)],
				with: {
					shifts: {
						orderBy: (s, { asc }) => [asc(s.startsAt)],
						with: {
							signups: {
								orderBy: (su, { asc }) => [asc(su.createdAt)],
								with: {
									user: {
										columns: { id: true, name: true, phone: true, emailPlaceholder: true }
									}
								}
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
		instructions: row.instructions,
		startDate: row.startDate,
		endDate: row.endDate,
		shareToken: row.shareToken,
		// Ownership calculé serveur (jamais l'`organizerId` brut vers le client).
		isOwner: userId !== null && row.organizerId === userId,
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
					note: organizerView || su.userId === userId ? su.note : null,
					// Détail d'organisation : les bénévoles n'ont pas à savoir qui utilise l'app.
					isManaged: organizerView ? su.user.emailPlaceholder : false
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
 * Insère une inscription en respectant la capacité de façon **atomique**.
 * - `maybe` : insertion directe (ne consomme pas de place).
 * - `available` : INSERT conditionnel en une requête — le driver neon-http ne supporte pas les
 *   transactions interactives, donc toute fenêtre read-then-write permettrait de dépasser la
 *   capacité sur la dernière place.
 *
 * Partagé par l'inscription bénévole (`createSignup`) et l'affectation organisateur
 * (`assignVolunteer`) : dupliquer ce SQL, c'est dupliquer la garantie de concurrence.
 * Erreurs : `FULL`, `DUPLICATE`.
 */
async function insertSignupAtomic(
	shiftId: string,
	userId: string,
	status: SignupStatus,
	note: string | null,
	capacity: number
): Promise<void> {
	try {
		if (status === 'maybe') {
			await db.insert(signup).values({ shiftId, userId, status: 'maybe', note });
			return;
		}

		// `available` : on insère seulement si le nombre d'available reste sous la capacité.
		const res = await db.execute(sql`
			INSERT INTO signup (shift_id, user_id, status, note)
			SELECT ${shiftId}::uuid, ${userId}, 'available', ${note}
			WHERE (
				SELECT count(*) FROM signup
				WHERE shift_id = ${shiftId}::uuid AND status = 'available'
			) < ${capacity}
			RETURNING id
		`);
		if (res.rows.length === 0) throw new Error('FULL');
	} catch (err) {
		if (isUniqueViolation(err)) throw new Error('DUPLICATE');
		throw err;
	}
}

/**
 * Inscrit l'utilisateur sur un créneau.
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

	await insertSignupAtomic(shiftId, userId, status, note ?? null, s.capacity);

	// Inscription `available` créée → planifie les rappels QStash (best-effort ; une `maybe`
	// ne déclenche aucun rappel).
	if (status === 'available') await scheduleForSignup(shiftId, userId);
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

	// Promotion `maybe` → `available` réussie → planifie les rappels QStash.
	await scheduleForSignup(shiftId, userId);
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

/**
 * Créneau résolu pour un organisateur : capacité, tournoi parent, nb d'available courant, et les
 * libellés nécessaires à la trace et aux notifications (une seule requête sert les trois usages).
 */
type OrganizerShift = {
	capacity: number;
	tournamentId: string;
	available: number;
	positionName: string;
	startsAt: Date;
	endsAt: Date;
	tournamentName: string;
	shareToken: string;
};

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
			)`,
			positionName: position.name,
			startsAt: shift.startsAt,
			endsAt: shift.endsAt,
			tournamentName: tournament.name,
			shareToken: tournament.shareToken
		})
		.from(shift)
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(and(eq(shift.id, shiftId), eq(tournament.organizerId, organizerId)))
		.limit(1);
	return rows[0] ?? null;
}

/** « Buvette · sam. 21 juin, 10:00–14:00 » — libellé stable, stocké tel quel dans l'historique. */
function shiftLabel(s: OrganizerShift): string {
	return `${s.positionName} · ${formatDay(s.startsAt)}, ${formatTime(s.startsAt)}–${formatTime(s.endsAt)}`;
}

/** Nom d'un utilisateur (instantané pour la trace, qui doit survivre à la suppression du compte). */
async function getUserName(userId: string): Promise<string | null> {
	const rows = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
	return rows[0]?.name ?? null;
}

/**
 * Résultat d'une édition d'affectation. `notified: false` signifie que le bénévole **n'a pas
 * été prévenu** — il n'a pas d'abonnement push, ou c'est une fiche créée par l'organisateur qui
 * n'utilise pas l'app. L'UI doit le dire (« appelez-le ») plutôt qu'annoncer un succès complet.
 */
export type AssignmentResult = { notified: boolean };

/**
 * Post-traitement commun aux quatre opérations : écrit la trace et prévient le bénévole.
 * Les deux sont best-effort et ne peuvent pas faire échouer la mutation déjà commitée.
 */
async function traceAndNotify(
	organizerId: string,
	tournamentId: string,
	entry: {
		action: 'add' | 'remove' | 'move' | 'swap';
		volunteerId: string;
		/** Fourni quand l'appelant l'a déjà lu (ex. avant un DELETE), sinon relu ici. */
		volunteerName?: string;
		detail: string;
		reason?: string | null;
		push: PushPayload;
	}
): Promise<AssignmentResult> {
	const [actorName, volunteerName] = await Promise.all([
		getUserName(organizerId),
		entry.volunteerName ? Promise.resolve(entry.volunteerName) : getUserName(entry.volunteerId)
	]);

	await logAssignment({
		tournamentId,
		action: entry.action,
		actorId: organizerId,
		actorName: actorName ?? 'Organisateur',
		volunteerId: entry.volunteerId,
		volunteerName: volunteerName ?? 'Bénévole',
		detail: entry.detail,
		reason: entry.reason ?? null
	});

	const delivered = await notifyUser(entry.volunteerId, entry.push);
	return { notified: delivered > 0 };
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
): Promise<AssignmentResult> {
	if (source.shiftId === targetShiftId) return { notified: true }; // no-op

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

	// Le bénévole a changé de créneau → reprogramme ses rappels sur le nouveau `startsAt`
	// (no-op interne si son statut est `maybe`).
	await scheduleForSignup(targetShiftId, source.userId);

	return traceAndNotify(organizerId, tournamentId, {
		action: 'move',
		volunteerId: source.userId,
		detail: `${shiftLabel(src)} → ${shiftLabel(tgt)}`,
		push: {
			title: 'Créneau modifié',
			body: `${tgt.tournamentName} — vous passez sur ${shiftLabel(tgt)}.`,
			url: `/t/${tgt.shareToken}`
		}
	});
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
): Promise<AssignmentResult> {
	if (a.userId === b.userId) return { notified: true }; // même bénévole : rien à échanger
	if (a.shiftId === b.shiftId) return { notified: true }; // même créneau : pas de déplacement

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

	// Chaque bénévole a changé de créneau → reprogramme les deux (a → b.shiftId, b → a.shiftId).
	await scheduleForSignup(b.shiftId, a.userId);
	await scheduleForSignup(a.shiftId, b.userId);

	// Deux entrées d'historique et deux notifications : l'échange concerne deux personnes, et
	// chacune doit savoir où elle atterrit. `notified` n'est vrai que si les DEUX sont prévenues.
	const [ra, rb] = await Promise.all([
		traceAndNotify(organizerId, tournamentId, {
			action: 'swap',
			volunteerId: a.userId,
			detail: `${shiftLabel(sa)} → ${shiftLabel(sb)}`,
			push: {
				title: 'Créneau échangé',
				body: `${sb.tournamentName} — vous passez sur ${shiftLabel(sb)}.`,
				url: `/t/${sb.shareToken}`
			}
		}),
		traceAndNotify(organizerId, tournamentId, {
			action: 'swap',
			volunteerId: b.userId,
			detail: `${shiftLabel(sb)} → ${shiftLabel(sa)}`,
			push: {
				title: 'Créneau échangé',
				body: `${sa.tournamentName} — vous passez sur ${shiftLabel(sa)}.`,
				url: `/t/${sa.shareToken}`
			}
		})
	]);

	return { notified: ra.notified && rb.notified };
}

/* ------------------------------------------------------------------ *
 * Inscription & retrait par l'organisateur (Epic 14).
 * ------------------------------------------------------------------ */

/**
 * Inscrit un bénévole sur un créneau à l'initiative de l'organisateur.
 *
 * Mode `existing` : compte déjà connu. Mode `new` : on crée une fiche (cf.
 * `volunteer-directory.createManagedVolunteer`) — avec email elle deviendra un compte utilisable
 * à la première connexion, sans email elle n'existe que dans le tableau de l'organisateur.
 *
 * La capacité reste garantie en concurrence par `insertSignupAtomic` : un organisateur qui
 * inscrit pendant qu'un bénévole s'inscrit ne peut pas faire dépasser la capacité.
 * Erreurs : `NOT_FOUND`, `FULL`, `DUPLICATE`, `RESERVED_DOMAIN`.
 */
export async function assignVolunteer(
	organizerId: string,
	tournamentId: string,
	input: AssignInput
): Promise<AssignmentResult & { volunteerId: string; hasRealEmail: boolean }> {
	const target = await getOrganizerShift(input.shiftId, organizerId);
	if (!target || target.tournamentId !== tournamentId) throw new Error('NOT_FOUND');

	// Résolution du bénévole AVANT l'insertion : en mode `new` la fiche doit exister pour que
	// la FK `signup.user_id` tienne.
	let volunteerId: string;
	let hasRealEmail: boolean;
	if (input.mode === 'existing') {
		const name = await getUserName(input.userId);
		if (!name) throw new Error('NOT_FOUND');
		volunteerId = input.userId;
		hasRealEmail = true;
	} else {
		const created = await createManagedVolunteer(
			{ name: input.name, phone: input.phone, email: input.email },
			organizerId
		);
		volunteerId = created.userId;
		hasRealEmail = created.hasRealEmail;
	}

	await insertSignupAtomic(
		input.shiftId,
		volunteerId,
		input.status,
		input.note ?? null,
		target.capacity
	);

	if (input.status === 'available') await scheduleForSignup(input.shiftId, volunteerId);

	const result = await traceAndNotify(organizerId, tournamentId, {
		action: 'add',
		volunteerId,
		detail: shiftLabel(target),
		reason: input.note ?? null,
		push: {
			title: 'Vous avez été inscrit·e',
			body: `${target.tournamentName} — ${shiftLabel(target)}.`,
			url: `/t/${target.shareToken}`
		}
	});

	return { ...result, volunteerId, hasRealEmail };
}

/**
 * Retire un bénévole d'un créneau — « qu'on puisse également éliminer une tâche » (Anne).
 *
 * On lit la ligne **avant** le DELETE : le nom et le créneau sont nécessaires à la trace, et
 * après suppression ils ne sont plus lisibles. **Aucune annulation QStash n'est nécessaire** :
 * le récepteur de rappel re-valide l'état à la livraison et drop si l'inscription a disparu
 * (cf. `reminder-scheduler.ts` et `reminder-service.processSignupReminder`).
 * Erreurs : `NOT_FOUND`.
 */
export async function removeAssignment(
	organizerId: string,
	tournamentId: string,
	target: { shiftId: string; userId: string },
	reason?: string
): Promise<AssignmentResult & { volunteerName: string }> {
	const src = await getOrganizerShift(target.shiftId, organizerId);
	if (!src || src.tournamentId !== tournamentId) throw new Error('NOT_FOUND');

	const rows = await db
		.select({ name: user.name })
		.from(signup)
		.innerJoin(user, eq(signup.userId, user.id))
		.where(and(eq(signup.shiftId, target.shiftId), eq(signup.userId, target.userId)))
		.limit(1);
	if (rows.length === 0) throw new Error('NOT_FOUND');
	const volunteerName = rows[0].name;

	await db
		.delete(signup)
		.where(and(eq(signup.shiftId, target.shiftId), eq(signup.userId, target.userId)));

	const result = await traceAndNotify(organizerId, tournamentId, {
		action: 'remove',
		volunteerId: target.userId,
		volunteerName,
		detail: shiftLabel(src),
		reason: reason ?? null,
		push: {
			title: 'Créneau annulé',
			body: `${src.tournamentName} — vous avez été retiré·e de ${shiftLabel(src)}.`,
			url: `/t/${src.shareToken}`
		}
	});

	return { ...result, volunteerName };
}
