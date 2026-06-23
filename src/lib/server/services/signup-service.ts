import { and, eq, sql } from 'drizzle-orm';
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

/** Une inscription telle qu'affichée côté bénévole (nom visible — décision produit). */
export type VolunteerSignup = { userId: string; name: string; status: SignupStatus };

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
 * Lecture publique d'un tournoi via son `share_token`, avec postes, créneaux et inscrits.
 * Calcule par créneau les compteurs (available/maybe/remaining/isFull) et le statut de
 * l'utilisateur courant (`myStatus`). Retourne `null` si le token est inconnu (→ 404).
 */
export async function getTournamentByShareToken(
	shareToken: string,
	userId: string | null
): Promise<VolunteerTournament | null> {
	const row = await db.query.tournament.findFirst({
		where: eq(tournament.shareToken, shareToken),
		with: {
			positions: {
				orderBy: (p, { asc }) => [asc(p.createdAt)],
				with: {
					shifts: {
						orderBy: (s, { asc }) => [asc(s.startsAt)],
						with: {
							signups: {
								orderBy: (su, { asc }) => [asc(su.createdAt)],
								with: { user: { columns: { id: true, name: true } } }
							}
						}
					}
				}
			}
		}
	});

	if (!row) return null;

	return {
		id: row.id,
		name: row.name,
		location: row.location,
		startDate: row.startDate,
		endDate: row.endDate,
		shareToken: row.shareToken,
		positions: row.positions.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			color: p.color,
			shifts: p.shifts.map((s) => {
				const signups: VolunteerSignup[] = s.signups.map((su) => ({
					userId: su.userId,
					name: su.user.name,
					status: su.status
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
					myStatus: mine ? mine.status : null
				};
			})
		}))
	};
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
	status: SignupStatus
): Promise<void> {
	const s = await getShift(shiftId);
	if (!s) throw new Error('NOT_FOUND');

	try {
		if (status === 'maybe') {
			await db.insert(signup).values({ shiftId, userId, status: 'maybe' });
			return;
		}

		// `available` : on insère seulement si le nombre d'available reste sous la capacité.
		const res = await db.execute(sql`
			INSERT INTO signup (shift_id, user_id, status)
			SELECT ${shiftId}::uuid, ${userId}, 'available'
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
	status: SignupStatus
): Promise<void> {
	const s = await getShift(shiftId);
	if (!s) throw new Error('NOT_FOUND');

	const existing = await db
		.select({ status: signup.status })
		.from(signup)
		.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)))
		.limit(1);

	// Pas d'inscription existante → comportement « créer ».
	if (existing.length === 0) {
		await createSignup(shiftId, userId, status);
		return;
	}

	if (status === 'maybe') {
		await db
			.update(signup)
			.set({ status: 'maybe' })
			.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
		return;
	}

	// Déjà `available` → rien à faire.
	if (existing[0].status === 'available') return;

	// Promotion `maybe` → `available` : conditionnelle sur la capacité (hors sa propre ligne).
	const res = await db.execute(sql`
		UPDATE signup SET status = 'available'
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
 * Désinscrit l'utilisateur d'un créneau (idempotent). Le WHERE filtre sur `user_id` :
 * impossible de retirer l'inscription d'autrui. Libère la place au prochain recalcul.
 */
export async function deleteSignup(shiftId: string, userId: string): Promise<void> {
	await db.delete(signup).where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)));
}
