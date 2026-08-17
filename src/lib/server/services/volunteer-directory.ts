import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { user, signup, shift, position } from '$lib/server/db/schema';
import { MANAGED_EMAIL_DOMAIN, isManagedEmail } from './email';

/**
 * Annuaire bénévole côté organisateur (Epic 14) : rechercher un compte existant, ou créer une
 * fiche pour quelqu'un qui n'utilise pas l'app (« Noélie pour l'annonce des matchs »).
 *
 * **Modèle** : on ne rend PAS `signup.userId` nullable — ça casserait matrice, récap, export et
 * rappels, tous indexés par `userId`. On crée à la place un compte géré par l'organisateur, avec
 * email réel si connu, sinon email généré non routable. Toute la chaîne existante fonctionne
 * alors sans modification.
 *
 * Trois niveaux, du plus au moins capable :
 * 1. compte existant → voit ses créneaux, reçoit ses rappels ;
 * 2. fiche avec vrai email → inerte jusqu'à sa 1re connexion, puis tout marche **rétroactivement**
 *    (`signup.userId` ne change jamais, le magic link signe dans le compte existant) ;
 * 3. fiche sans email → visible de l'organisateur uniquement, jamais de connexion ni de rappel.
 *
 * **Confidentialité** : c'est la première surface qui expose l'annuaire à un organisateur. On ne
 * renvoie jamais l'email complet d'un tiers, et le téléphone est masqué à la recherche (il n'est
 * révélé que par la matrice, pour un bénévole effectivement inscrit sur son tournoi).
 */

export type VolunteerSearchResult = {
	id: string;
	name: string;
	/** Téléphone partiellement masqué (`•••• 45 67`), assez pour lever une homonymie. */
	phoneMasked: string | null;
	/** Fiche créée par un organisateur : pas de connexion, pas de rappel. */
	isManaged: boolean;
	/** Déjà inscrit sur au moins un créneau de ce tournoi (remonté en tête de liste). */
	alreadyInTournament: boolean;
};

/** Ne garde que les 4 derniers chiffres : lève une homonymie sans divulguer le numéro. */
function maskPhone(phone: string | null): string | null {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, '');
	if (digits.length < 4) return '••••';
	return `•••• ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
}

/**
 * Recherche un bénévole par nom ou email (`ilike`, 10 résultats max). Les bénévoles déjà
 * inscrits sur ce tournoi remontent en tête : dans la pratique l'organisateur ré-affecte
 * bien plus souvent quelqu'un qui est déjà là qu'il n'en ajoute un inconnu.
 *
 * La recherche porte aussi sur l'email (l'organisateur peut le connaître) mais ne le renvoie
 * jamais — sinon la barre de recherche devient un extracteur d'adresses.
 */
export async function searchVolunteers(
	query: string,
	tournamentId: string
): Promise<VolunteerSearchResult[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	const pattern = `%${q}%`;

	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			phone: user.phone,
			emailPlaceholder: user.emailPlaceholder,
			// Sous-requête plutôt qu'un join : évite de dupliquer une ligne utilisateur par
			// inscription et garde le `limit` sur des utilisateurs distincts.
			alreadyInTournament: sql<boolean>`EXISTS (
				SELECT 1 FROM signup
				JOIN shift ON shift.id = signup.shift_id
				JOIN position ON position.id = shift.position_id
				WHERE signup.user_id = ${user.id} AND position.tournament_id = ${tournamentId}::uuid
			)`
		})
		.from(user)
		.where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
		// Tri par nom de colonne de sortie (et non par ordinal, qui désignerait `phone`).
		.orderBy(sql`"alreadyInTournament" DESC`, user.name)
		.limit(10);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		phoneMasked: maskPhone(r.phone),
		isManaged: r.emailPlaceholder,
		alreadyInTournament: r.alreadyInTournament
	}));
}

/**
 * Crée une fiche bénévole gérée par l'organisateur, ou réutilise le compte si l'email fourni
 * est déjà connu (jamais de doublon sur l'email — la contrainte `user.email` est unique).
 *
 * Sans email, on génère une adresse non routable : `user.email` est `NOT NULL UNIQUE`, il faut
 * bien une valeur. Le flag `emailPlaceholder` marque cette fiche partout où ça compte (garde
 * d'envoi, badge matrice, stats admin). Motif d'insertion directe : `admin-service.ts` →
 * `createOrganizer`, qui crée déjà des comptes hors Better Auth.
 */
export async function createManagedVolunteer(
	input: { name: string; phone: string; email?: string },
	createdBy: string
): Promise<{ userId: string; created: boolean; hasRealEmail: boolean }> {
	const email = input.email?.trim().toLowerCase() || null;

	// Un organisateur ne doit pas pouvoir s'approprier une fiche en saisissant son adresse générée.
	if (email && isManagedEmail(email)) throw new Error('RESERVED_DOMAIN');

	if (email) {
		const existing = await db
			.select({ id: user.id, emailPlaceholder: user.emailPlaceholder })
			.from(user)
			.where(eq(user.email, email))
			.limit(1);
		if (existing.length > 0) {
			return { userId: existing[0].id, created: false, hasRealEmail: true };
		}
	}

	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		// Sans vrai email : adresse générée, non routable, jamais destinataire d'un envoi.
		email: email ?? `manuel-${nanoid(8)}${MANAGED_EMAIL_DOMAIN}`,
		name: input.name.trim(),
		phone: input.phone.trim(),
		role: 'volunteer',
		emailVerified: false,
		createdBy,
		emailPlaceholder: email === null
	});
	return { userId: id, created: true, hasRealEmail: email !== null };
}

/**
 * Rattache un vrai email à une fiche sans email : le compte devient connectable et le bénévole
 * retrouve **ses affectations déjà posées** (`signup.userId` n'a pas bougé). C'est la sortie de
 * secours du niveau 3 — sans elle, les fiches inertes s'accumulent définitivement.
 *
 * Erreurs : `NOT_FOUND` (compte inconnu), `NOT_MANAGED` (le compte a déjà un vrai email — on ne
 * change pas l'identité d'un compte actif depuis la matrice), `EMAIL_TAKEN` (email déjà pris),
 * `RESERVED_DOMAIN`.
 */
export async function attachEmail(userId: string, email: string): Promise<void> {
	const normalized = email.trim().toLowerCase();
	if (isManagedEmail(normalized)) throw new Error('RESERVED_DOMAIN');

	const rows = await db
		.select({ id: user.id, emailPlaceholder: user.emailPlaceholder })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (rows.length === 0) throw new Error('NOT_FOUND');
	if (!rows[0].emailPlaceholder) throw new Error('NOT_MANAGED');

	const taken = await db
		.select({ id: user.id })
		.from(user)
		.where(and(eq(user.email, normalized)))
		.limit(1);
	if (taken.length > 0 && taken[0].id !== userId) throw new Error('EMAIL_TAKEN');

	await db
		.update(user)
		.set({ email: normalized, emailPlaceholder: false, updatedAt: new Date() })
		.where(eq(user.id, userId));
}

/**
 * Bénévoles gérés inscrits sur ce tournoi et **sans email réel** — ceux qui ne verront jamais
 * leur planning dans l'app. Sert à alerter l'organisateur au bon moment plutôt que de le laisser
 * croire que tout le monde a reçu son rappel.
 */
export async function listManagedVolunteers(
	tournamentId: string
): Promise<{ id: string; name: string }[]> {
	const rows = await db
		.selectDistinct({ id: user.id, name: user.name })
		.from(user)
		.innerJoin(signup, eq(signup.userId, user.id))
		.innerJoin(shift, eq(signup.shiftId, shift.id))
		.innerJoin(position, eq(shift.positionId, position.id))
		.where(and(eq(position.tournamentId, tournamentId), eq(user.emailPlaceholder, true)))
		.orderBy(user.name);
	return rows;
}
