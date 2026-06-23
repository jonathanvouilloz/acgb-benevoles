import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { db } from './db';
import * as schema from './db/schema';
import { sendMagicLinkEmail } from './services/email';

/**
 * Instance Better Auth — auth sans mot de passe par magic link (cf. docs/features/02-auth.md).
 *
 * - `isOrganizer` est un champ additionnel en lecture seule côté client (`input: false`) :
 *   la promotion organisateur se fait manuellement en DB (décision MVP).
 * - Session 30 jours, renouvelée chaque jour, pour que la PWA reste connectée.
 */
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	user: {
		additionalFields: {
			isOrganizer: { type: 'boolean', defaultValue: false, input: false }
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 jours
		updateAge: 60 * 60 * 24 // renouvelé après 1 jour d'usage
	},
	plugins: [
		magicLink({
			expiresIn: 60 * 15, // lien valable 15 min
			sendMagicLink: async ({ email, url }) => {
				// En dev : log le lien dans la console pour tester sans domaine Resend vérifié,
				// et on tolère un échec d'envoi (Resend n'autorise que l'email du compte).
				if (dev) {
					console.log(`\n🔗 [magic link] ${email}\n   ${url}\n`);
				}
				try {
					await sendMagicLinkEmail(email, url);
				} catch (err) {
					if (!dev) throw err;
					console.warn(
						'[magic link] envoi email ignoré (dev) :',
						err instanceof Error ? err.message : err
					);
				}
			}
		})
	]
});
