import { eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { signup, signupDigest, shift, position, user } from '$lib/server/db/schema';
import { isManagedEmail } from './email';
import { getQstashClient, publicUrl, safeDedupId } from './qstash';

/**
 * Planification du recap email differe (Epic 15) — cote ECRITURE.
 *
 * Probleme resolu : un benevole qui coche cinq creneaux d'affilee ne doit pas recevoir cinq
 * emails. On applique la doctrine deja en place pour les rappels (« planifier, jamais annuler,
 * re-valider a la livraison »), transposee d'un horodatage de creneau a un compteur de revision.
 *
 * Chaque changement incremente `revision` et publie un message differe qui la porte. A
 * l'echeance, `processDigest` ne l'envoie que s'il porte encore la revision courante : les
 * quatre premiers messages meurent, seul le dernier passe. C'est un debounce a front descendant,
 * sans aucun etat de timer cote serveur.
 *
 * Best-effort integral : cette fonction ne leve jamais. Une panne QStash ne doit pas empecher
 * quelqu'un de s'inscrire.
 */

/** Fenetre de regroupement. Reglable pour tester en staging (QStash n'atteint pas localhost). */
const DIGEST_DELAY_MIN = Number(env.DIGEST_DELAY_MIN) > 0 ? Number(env.DIGEST_DELAY_MIN) : 10;

export const DIGEST_CALLBACK_PATH = '/api/qstash/digest';

/**
 * Marque `(userId, tournamentId)` comme modifie et programme le recap.
 *
 * L'ORDRE DES ETAPES N'EST PAS NEGOCIABLE :
 * 1. QStash absent → on sort AVANT toute ecriture (pas de ligne parasite en base de dev) ;
 * 2. pas de boite reelle → on sort (ni ligne, ni quota consomme) ;
 * 3. bump de la revision ;
 * 4. publication.
 *
 * Publier avant de bumper ouvrirait une fenetre ou le message est livre avant que sa revision
 * ne soit visible : il se croirait perime et dropperait. Un publish qui echoue apres un bump
 * reussi ne laisse qu'une ligne inerte, rattrapee au changement suivant.
 */
export async function enqueueDigest(
	userId: string,
	tournamentId: string,
	opts: { byOrganizer: boolean }
): Promise<void> {
	try {
		const qstash = getQstashClient();
		if (!qstash) return;

		// Une fiche sans boite reelle ne recevra jamais rien : inutile de consommer un message.
		// Re-verifie a la livraison, l'organisateur ayant pu rattacher un email entre-temps.
		const rows = await db
			.select({ email: user.email, emailPlaceholder: user.emailPlaceholder })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		const row = rows[0];
		if (!row || row.emailPlaceholder || isManagedEmail(row.email)) return;

		const [bumped] = await db
			.insert(signupDigest)
			.values({ userId, tournamentId, revision: 1, byOrganizer: opts.byOrganizer })
			.onConflictDoUpdate({
				target: [signupDigest.userId, signupDigest.tournamentId],
				// IMPERATIF : `signupDigest.revision + 1` (la ligne existante), PAS `excluded.revision`
				// (la valeur proposee, toujours 1). Avec `excluded`, la revision resterait bloquee a 1,
				// tous les messages se croiraient frais, et on repartirait a un email par clic.
				set: {
					revision: sql`${signupDigest.revision} + 1`,
					byOrganizer: opts.byOrganizer,
					scheduledAt: new Date()
				}
			})
			.returning({ revision: signupDigest.revision });
		if (!bumped) return;

		// `notBefore` part de `Date.now()` : c'est un instant REEL, pas une heure murale.
		// Ne surtout pas passer par `zurichWallClockToInstant` (contrairement aux rappels, qui
		// visent l'heure affichee d'un creneau) — il n'y a aucune heure murale dans ce declencheur.
		await qstash.publishJSON({
			url: publicUrl(DIGEST_CALLBACK_PATH),
			body: { v: 1, userId, tournamentId, revision: bumped.revision },
			notBefore: Math.floor(Date.now() / 1000) + DIGEST_DELAY_MIN * 60,
			// Filet secondaire : absorbe un publish rejoue (retry reseau du SDK) pour la meme
			// revision. La correction ne repose jamais dessus — c'est la re-validation qui fait foi.
			deduplicationId: safeDedupId('dig', userId, tournamentId, bumped.revision)
		});
	} catch (err) {
		// Best-effort : on n'echoue jamais l'action metier qui a declenche le recap.
		console.error('[digest-scheduler] enqueueDigest failed', err);
	}
}

/**
 * Recap pour TOUS les inscrits d'un creneau — analogue de `scheduleForShift`.
 *
 * A appeler AVANT une suppression de creneau (apres, les inscriptions ont cascade et il n'y a
 * plus personne a prevenir), et apres un deplacement d'horaire. Sans ca, un benevole peut se
 * presenter a un creneau qui n'existe plus ou qui a change d'heure.
 *
 * Le contenu etant relu en base a l'envoi (10 min plus tard), le recap dira la verite quelle que
 * soit la mutation qui l'a declenche.
 */
export async function enqueueDigestForShift(shiftId: string): Promise<void> {
	try {
		const rows = await db
			.select({ userId: signup.userId, tournamentId: position.tournamentId })
			.from(signup)
			.innerJoin(shift, eq(signup.shiftId, shift.id))
			.innerJoin(position, eq(shift.positionId, position.id))
			.where(eq(signup.shiftId, shiftId));

		for (const row of rows) {
			await enqueueDigest(row.userId, row.tournamentId, { byOrganizer: true });
		}
	} catch (err) {
		console.error('[digest-scheduler] enqueueDigestForShift failed', err);
	}
}
