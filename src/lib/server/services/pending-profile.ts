import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { verification } from '$lib/server/db/schema';

/**
 * Profil saisi à la création de compte (nom + téléphone), en attente de la vérification.
 *
 * Le compte naît au clic sur le magic link OU à la saisie du code reçu par email. Aucun des
 * deux ne transmet `phone` (le magic link ne relaie que `name`, le code rien du tout) : sans
 * relais, tout nouveau compte naît sans numéro ni nom et se retrouve bloqué à l'inscription
 * (cf. `needsPhone` sur /t/[token]). On met donc le profil de côté dans la table
 * `verification` (même durée de vie que le lien et le code), puis le hook
 * `user.create.before` de `auth.ts` l'applique au compte créé.
 */

export type PendingProfile = { name: string; phone: string };

const TTL_MS = 15 * 60 * 1000; // = expiresIn du magic link et du code
const key = (email: string) => `pending-profile:${email.toLowerCase()}`;

/** Mémorise le profil d'une création de compte en cours (remplace une saisie précédente). */
export async function stashPendingProfile(email: string, profile: PendingProfile): Promise<void> {
	await db.delete(verification).where(eq(verification.identifier, key(email)));
	await db.insert(verification).values({
		id: crypto.randomUUID(),
		identifier: key(email),
		value: JSON.stringify(profile),
		expiresAt: new Date(Date.now() + TTL_MS)
	});
}

/**
 * Lit le profil en attente sans le consommer. Pour la connexion par code : le plugin
 * `emailOTP` exige les champs requis (`phone`) dans le body AVANT le hook de création.
 */
export async function peekPendingProfile(email: string): Promise<PendingProfile | null> {
	const rows = await db
		.select({ value: verification.value })
		.from(verification)
		.where(and(eq(verification.identifier, key(email)), gt(verification.expiresAt, new Date())))
		.orderBy(desc(verification.createdAt))
		.limit(1);
	if (!rows[0]) return null;
	try {
		return JSON.parse(rows[0].value) as PendingProfile;
	} catch {
		return null;
	}
}

/** Récupère (et consomme) le profil en attente pour cet email, s'il n'a pas expiré. */
export async function takePendingProfile(email: string): Promise<PendingProfile | null> {
	const profile = await peekPendingProfile(email);
	await db.delete(verification).where(eq(verification.identifier, key(email)));
	return profile;
}
