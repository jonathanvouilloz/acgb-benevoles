import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { verification } from '$lib/server/db/schema';

/**
 * Téléphone saisi à la création de compte, en attente du clic sur le magic link.
 *
 * Le plugin magic link de Better Auth ne transmet que `name` à la création du compte : le
 * téléphone passé dans le body est ignoré. Sans relais, tout nouveau compte naît sans numéro
 * et se retrouve bloqué à l'inscription (cf. `needsPhone` sur /t/[token]). On le met donc de
 * côté dans la table `verification` (même durée de vie que le lien), puis le hook
 * `user.create.before` de `auth.ts` l'applique au compte créé.
 */

const TTL_MS = 15 * 60 * 1000; // = expiresIn du magic link
const key = (email: string) => `pending-phone:${email.toLowerCase()}`;

/** Mémorise le téléphone d'une création de compte en cours (remplace une saisie précédente). */
export async function stashPendingPhone(email: string, phone: string): Promise<void> {
	await db.delete(verification).where(eq(verification.identifier, key(email)));
	await db.insert(verification).values({
		id: crypto.randomUUID(),
		identifier: key(email),
		value: phone,
		expiresAt: new Date(Date.now() + TTL_MS)
	});
}

/** Récupère (et consomme) le téléphone en attente pour cet email, s'il n'a pas expiré. */
export async function takePendingPhone(email: string): Promise<string | null> {
	const rows = await db
		.select({ value: verification.value })
		.from(verification)
		.where(and(eq(verification.identifier, key(email)), gt(verification.expiresAt, new Date())))
		.orderBy(desc(verification.createdAt))
		.limit(1);
	await db.delete(verification).where(eq(verification.identifier, key(email)));
	return rows[0]?.value ?? null;
}
