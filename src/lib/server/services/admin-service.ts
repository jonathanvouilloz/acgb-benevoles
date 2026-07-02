import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	organizerRequest,
	position,
	shift,
	signup,
	tournament,
	user,
	type UserRole
} from '$lib/server/db/schema';
import { tournamentPhase, type TournamentPhase } from '$lib/tournament-status';

/* ─────────────────────────── Utilisateurs ─────────────────────────── */

export type AdminUserRow = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	role: UserRole;
	createdAt: Date;
	organizedCount: number;
	signupCount: number;
};

/** Liste tous les utilisateurs avec le nb de tournois organisés et d'inscriptions bénévole. */
export async function listUsers(): Promise<AdminUserRow[]> {
	const [users, organized, signed] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt)),
		db
			.select({ organizerId: tournament.organizerId, n: sql<number>`count(*)::int` })
			.from(tournament)
			.groupBy(tournament.organizerId),
		db
			.select({ userId: signup.userId, n: sql<number>`count(*)::int` })
			.from(signup)
			.groupBy(signup.userId)
	]);

	const organizedBy = new Map(organized.map((r) => [r.organizerId, r.n]));
	const signedBy = new Map(signed.map((r) => [r.userId, r.n]));

	return users.map((u) => ({
		...u,
		organizedCount: organizedBy.get(u.id) ?? 0,
		signupCount: signedBy.get(u.id) ?? 0
	}));
}

/** Change le rôle d'un utilisateur. */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
	await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
}

/**
 * Crée (ou promeut) un compte organisateur par email.
 * - email déjà connu → passe le rôle à `organizer` ;
 * - email inconnu → crée un compte (rôle `organizer`), à activer par l'intéressé via connexion
 *   magic link (email seul). Le téléphone pourra être complété à la première connexion.
 */
export async function createOrganizer(input: {
	email: string;
	name: string;
	phone?: string | null;
}): Promise<{ created: boolean; userId: string }> {
	const email = input.email.trim().toLowerCase();
	const existing = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);

	if (existing.length > 0) {
		await setUserRole(existing[0].id, 'organizer');
		return { created: false, userId: existing[0].id };
	}

	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		email,
		name: input.name.trim(),
		phone: input.phone?.trim() || null,
		role: 'organizer',
		emailVerified: false
	});
	return { created: true, userId: id };
}

/* ─────────────────────────── Statistiques ─────────────────────────── */

export type AdminStats = {
	users: { total: number; volunteers: number; organizers: number; superAdmins: number };
	tournaments: { total: number; upcoming: number; ongoing: number; past: number };
	signups: number;
	pendingRequests: number;
	fillRate: number | null; // 0..1 (inscriptions « available » / capacité totale), null si 0 place
};

export async function getStats(): Promise<AdminStats> {
	const [roleRows, tourDates, signupCount, capacityRow, availableRow, pending] = await Promise.all([
		db.select({ role: user.role, n: sql<number>`count(*)::int` }).from(user).groupBy(user.role),
		db.select({ startDate: tournament.startDate, endDate: tournament.endDate }).from(tournament),
		db.select({ n: sql<number>`count(*)::int` }).from(signup),
		db.select({ n: sql<number>`coalesce(sum(${shift.capacity}), 0)::int` }).from(shift),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(signup)
			.where(eq(signup.status, 'available')),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(organizerRequest)
			.where(eq(organizerRequest.status, 'pending'))
	]);

	const byRole = new Map(roleRows.map((r) => [r.role, r.n]));
	const now = new Date();
	const phases = { upcoming: 0, ongoing: 0, past: 0 };
	for (const t of tourDates) phases[tournamentPhase(t.startDate, t.endDate, now)]++;

	const capacity = capacityRow[0]?.n ?? 0;
	const available = availableRow[0]?.n ?? 0;

	return {
		users: {
			total: (byRole.get('volunteer') ?? 0) + (byRole.get('organizer') ?? 0) + (byRole.get('super_admin') ?? 0),
			volunteers: byRole.get('volunteer') ?? 0,
			organizers: byRole.get('organizer') ?? 0,
			superAdmins: byRole.get('super_admin') ?? 0
		},
		tournaments: { total: tourDates.length, ...phases },
		signups: signupCount[0]?.n ?? 0,
		pendingRequests: pending[0]?.n ?? 0,
		fillRate: capacity > 0 ? available / capacity : null
	};
}

/* ─────────────────────────── Tournois (tous) ─────────────────────────── */

export type AdminTournamentRow = {
	id: string;
	name: string;
	location: string | null;
	startDate: Date;
	endDate: Date;
	shareToken: string;
	organizerName: string;
	organizerEmail: string;
	signupCount: number;
	phase: TournamentPhase;
};

/** Liste TOUS les tournois avec organisateur et nb d'inscriptions (tri : plus récents d'abord). */
export async function listAllTournaments(): Promise<AdminTournamentRow[]> {
	const rows = await db
		.select({
			id: tournament.id,
			name: tournament.name,
			location: tournament.location,
			startDate: tournament.startDate,
			endDate: tournament.endDate,
			shareToken: tournament.shareToken,
			organizerName: user.name,
			organizerEmail: user.email,
			signupCount: sql<number>`count(distinct ${signup.id})::int`
		})
		.from(tournament)
		.innerJoin(user, eq(tournament.organizerId, user.id))
		.leftJoin(position, eq(position.tournamentId, tournament.id))
		.leftJoin(shift, eq(shift.positionId, position.id))
		.leftJoin(signup, eq(signup.shiftId, shift.id))
		.groupBy(tournament.id, user.name, user.email)
		.orderBy(desc(tournament.startDate));

	const now = new Date();
	return rows.map((r) => ({ ...r, phase: tournamentPhase(r.startDate, r.endDate, now) }));
}

/* ─────────────────────────── Demandes organisateur ─────────────────────────── */

export type OrganizerRequestRow = {
	id: string;
	message: string | null;
	createdAt: Date;
	status: 'pending' | 'approved' | 'rejected';
	userId: string;
	userName: string;
	userEmail: string;
	userPhone: string | null;
};

/** Demandes de promotion organisateur (par défaut les `pending`, plus anciennes d'abord). */
export async function listOrganizerRequests(
	status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
): Promise<OrganizerRequestRow[]> {
	const rows = await db
		.select({
			id: organizerRequest.id,
			message: organizerRequest.message,
			createdAt: organizerRequest.createdAt,
			status: organizerRequest.status,
			userId: user.id,
			userName: user.name,
			userEmail: user.email,
			userPhone: user.phone
		})
		.from(organizerRequest)
		.innerJoin(user, eq(organizerRequest.userId, user.id))
		.where(status === 'all' ? undefined : eq(organizerRequest.status, status))
		.orderBy(organizerRequest.createdAt);
	return rows;
}

/** Approuve une demande : promeut le demandeur en organisateur et scelle la demande. */
export async function approveOrganizerRequest(requestId: string, reviewerId: string): Promise<void> {
	const [req] = await db
		.select({ userId: organizerRequest.userId })
		.from(organizerRequest)
		.where(and(eq(organizerRequest.id, requestId), eq(organizerRequest.status, 'pending')))
		.limit(1);
	if (!req) return;

	await db
		.update(user)
		.set({ role: 'organizer', updatedAt: new Date() })
		.where(eq(user.id, req.userId));
	await db
		.update(organizerRequest)
		.set({ status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() })
		.where(eq(organizerRequest.id, requestId));
}

/** Refuse une demande (sans changer le rôle). */
export async function rejectOrganizerRequest(requestId: string, reviewerId: string): Promise<void> {
	await db
		.update(organizerRequest)
		.set({ status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date() })
		.where(and(eq(organizerRequest.id, requestId), eq(organizerRequest.status, 'pending')));
}
