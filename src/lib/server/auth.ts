import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { db } from './db';
import * as schema from './db/schema';
import { sendMagicLinkEmail } from './services/email';
import { isPrototype, stashPrototypeLink } from './prototype';

/**
 * Instance Better Auth — auth sans mot de passe par magic link (cf. docs/features/02-auth.md).
 *
 * - `role` est un champ additionnel en lecture seule côté client (`input: false`) :
 *   la promotion `volunteer → organizer` passe par une demande validée par un super admin
 *   (cf. epics 8-9) ; le 1er super admin est promu manuellement en DB.
 * - Session 30 jours, renouvelée chaque jour, pour que la PWA reste connectée.
 */
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	secret: env.BETTER_AUTH_SECRET,
	// En dev, on laisse Better Auth déduire l'URL depuis la requête (en-tête Host) : le port
	// local varie (5173, 5174, …) et les liens magic-link + redirections suivent alors
	// automatiquement le bon port. En prod, on fixe BETTER_AUTH_URL — slash final retiré, car
	// un trailing slash fait dériver le basePath en `//api/auth` (handler 404, cf. isAuthPath).
	baseURL: dev ? undefined : env.BETTER_AUTH_URL?.replace(/\/+$/, ''),
	// Ports de dev Vite courants : tous fiables en local, pour que la connexion passe quel que
	// soit le port choisi (utile aussi pour la redirection de vérification du magic link).
	trustedOrigins: dev
		? ['5173', '5174', '5175', '5176'].map((p) => `http://localhost:${p}`)
		: [],
	user: {
		additionalFields: {
			// Rôle applicatif (volunteer | organizer | super_admin). Enum typé en `string`
			// côté Better Auth ; valeurs validées applicativement (cf. userRole dans schema.ts).
			role: { type: 'string', defaultValue: 'volunteer', input: false },
			// Téléphone obligatoire : saisi à la création via le magic link, éditable dans /compte.
			phone: { type: 'string', required: true, input: true }
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
				// Mode prototype : on n'envoie aucun email, on capture le lien pour le suivre
				// immédiatement côté serveur (connexion instantanée). Voir lib/server/prototype.ts.
				if (isPrototype) {
					stashPrototypeLink(email, url);
					return;
				}
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
