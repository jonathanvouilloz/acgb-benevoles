import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { loginSchema, emailLoginSchema, fullName } from '$lib/schemas/auth';
import { safeRedirect } from '$lib/server/auth-guard';
import { isPrototype, takePrototypeLink } from '$lib/server/prototype';
import { isManagedEmail } from '$lib/server/services/email';
import { consumeRateLimit } from '$lib/server/services/rate-limit';
import { stashPendingProfile } from '$lib/server/services/pending-profile';
import { stashLoginCode } from '$lib/server/services/login-code';
import type { Actions, PageServerLoad } from './$types';

/**
 * Quotas d'envoi de magic link (anti email-bombing / coût Resend). L'appel serveur
 * `auth.api.signInMagicLink` contourne le rate-limit HTTP de Better Auth : on borne donc
 * ici, par IP (source) et par email (victime ciblée depuis plusieurs IP).
 */
const THROTTLE = {
	ipLimit: 12, // envois par heure et par IP
	emailLimit: 4, // envois par heure et par email
	windowSec: 60 * 60
};

function retryMessage(sec: number): string {
	const min = Math.max(1, Math.ceil(sec / 60));
	return `Trop de tentatives. Réessaie dans ${min} minute${min > 1 ? 's' : ''}.`;
}

/**
 * Vérifie les quotas (IP puis email) avant d'envoyer un magic link. Renvoie un message
 * d'erreur si un quota est dépassé, sinon `null`. No-op en mode prototype (aucun email envoyé).
 */
async function throttleMagicLink(ip: string, email: string): Promise<string | null> {
	if (isPrototype) return null;
	const byIp = await consumeRateLimit(`magic:ip:${ip}`, THROTTLE.ipLimit, THROTTLE.windowSec);
	if (!byIp.ok) return retryMessage(byIp.retryAfterSec);
	const byEmail = await consumeRateLimit(
		`magic:email:${email}`,
		THROTTLE.emailLimit,
		THROTTLE.windowSec
	);
	if (!byEmail.ok) return retryMessage(byEmail.retryAfterSec);
	return null;
}

/**
 * Déjà connecté → pas de raison de rester sur /login (on rejoint la cible éventuelle).
 * `email` pré-remplit le champ (renvoi depuis « lien envoyé »).
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'));
	if (locals.user) throw redirect(303, redirectTo ?? '/');
	return {
		redirect: redirectTo,
		email: url.searchParams.get('email') ?? '',
		prototype: isPrototype
	};
};

type Step = 'email' | 'details';
type Errors = Record<string, string[] | undefined> | undefined;
type Values = { prenom: string; nom: string; email: string; phone: string };

/** Réponse d'échec à forme uniforme (un seul type ActionData côté page). */
function failure(
	status: number,
	payload: { step: Step; errors?: Errors; values: Values; formError?: string }
) {
	return fail(status, {
		step: payload.step,
		errors: payload.errors ?? undefined,
		values: payload.values,
		formError: payload.formError ?? undefined
	});
}

const emptyValues = (over: Partial<Values> = {}): Values => ({
	prenom: '',
	nom: '',
	email: '',
	phone: '',
	...over
});

/**
 * Génère le magic link et le code à 6 chiffres, envoyés dans un seul email. Comportement
 * normal : email envoyé → on retourne `null` (le flux continue vers « lien envoyé »). En mode prototype : aucun email, on retourne
 * l'URL de vérification capturée pour la suivre tout de suite (connexion instantanée).
 */
async function sendLink(
	headers: Headers,
	email: string,
	redirectTo: string,
	profile?: { name: string; phone: string }
): Promise<string | null> {
	// Ni le lien ni le code ne transmettent le profil : relais appliqué à la création.
	if (profile) await stashPendingProfile(email, profile);
	if (!isPrototype) {
		// Code créé sans envoi, puis glissé dans l'email du lien (cf. services/login-code).
		const code = await auth.api.createVerificationOTP({ body: { email, type: 'sign-in' } });
		stashLoginCode(email, code);
	}
	await auth.api.signInMagicLink({
		body: {
			email,
			...(profile ? { name: profile.name } : {}),
			callbackURL: redirectTo,
			// Query de la cible retirée : Better Auth re-décode errorCallbackURL à la vérification,
			// un `?` imbriqué (ex. `/t/x?prendre=…`) échoue alors sa validation et invalide tout le
			// lien. Sur lien expiré, on revient donc au tournoi sans l'intention d'inscription.
			errorCallbackURL: `/login?error=expired&redirect=${encodeURIComponent(redirectTo.split('?')[0])}`
		},
		headers
	});
	if (!isPrototype) return null;
	const link = takePrototypeLink(email);
	if (!link) return null;
	// Connexion instantanée : on ne garde que le chemin + query du lien de vérification pour
	// rediriger en same-origin → fonctionne quel que soit le port local (5173, 5174, …).
	try {
		const u = new URL(link);
		return u.pathname + u.search;
	} catch {
		return link;
	}
}

/** Écran « vérifie ta boîte » : porte l'email et la cible, pour le code et le renvoi. */
function sentUrl(email: string, redirectTo: string): string {
	const q = new URLSearchParams({ email, redirect: redirectTo });
	return `/login/sent?${q}`;
}

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const step: Step = form.get('step') === 'details' ? 'details' : 'email';
		const redirectTo = safeRedirect(form.get('redirect')) ?? '/';
		const ip = getClientAddress();

		// --- Étape 1 : email seul, le serveur décide (compte existant → lien ; inconnu → étape 2) ---
		if (step === 'email') {
			const parsed = emailLoginSchema.safeParse({ email: form.get('email') });
			if (!parsed.success) {
				return failure(400, {
					step,
					errors: parsed.error.flatten().fieldErrors,
					values: emptyValues({ email: String(form.get('email') ?? '') })
				});
			}
			const { email } = parsed.data;

			// Adresse générée (fiche créée par un organisateur) : le compte EXISTE en base, donc le
			// lookup ci-dessous passerait et l'écran « lien envoyé » s'afficherait pour un email qui
			// n'arrivera jamais. On coupe ici avec un message qui dit quoi faire.
			if (isManagedEmail(email)) {
				return failure(400, {
					step,
					formError:
						"Ce bénévole a été ajouté par un organisateur et n'a pas encore d'email personnel. Demande-lui de rattacher ton adresse.",
					values: emptyValues({ email })
				});
			}

			// On ne crée pas de compte ici : email inconnu → étape « encore 3 infos ». Retour de
			// succès (pas `fail`) : c'est un accueil, pas une erreur.
			const existing = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, email))
				.limit(1);
			if (existing.length === 0) {
				return {
					step: 'details' as const,
					errors: undefined,
					values: emptyValues({ email }),
					formError: undefined
				};
			}

			const throttled = await throttleMagicLink(ip, email);
			if (throttled) {
				return failure(429, { step, formError: throttled, values: emptyValues({ email }) });
			}

			let link: string | null;
			try {
				link = await sendLink(request.headers, email, redirectTo);
			} catch {
				return failure(502, {
					step,
					formError: "Impossible d'envoyer le lien pour le moment. Réessaie dans un instant.",
					values: emptyValues({ email })
				});
			}
			// Prototype : connexion instantanée (suivi du lien) ; sinon écran « lien envoyé ».
			throw redirect(303, link ?? sentUrl(email, redirectTo));
		}

		// --- Étape 2 (email inconnu) : prénom + nom + tél, email repris de l'étape 1 ---
		const parsed = loginSchema.safeParse({
			prenom: form.get('prenom'),
			nom: form.get('nom'),
			email: form.get('email'),
			phone: form.get('phone')
		});

		if (!parsed.success) {
			return failure(400, {
				step,
				errors: parsed.error.flatten().fieldErrors,
				values: emptyValues({
					prenom: String(form.get('prenom') ?? ''),
					nom: String(form.get('nom') ?? ''),
					email: String(form.get('email') ?? ''),
					phone: String(form.get('phone') ?? '')
				})
			});
		}

		const { email, phone } = parsed.data;

		// Même garde à la création : personne ne doit pouvoir s'approprier une fiche en devinant
		// son adresse générée (le compte existe, Better Auth signerait dedans).
		if (isManagedEmail(email)) {
			return failure(400, {
				step,
				errors: { email: ['Ce domaine est réservé. Utilise ton adresse email personnelle.'] },
				values: emptyValues({
					prenom: parsed.data.prenom,
					nom: parsed.data.nom,
					email,
					phone: phone ?? ''
				})
			});
		}

		const throttled = await throttleMagicLink(ip, email);
		if (throttled) {
			return failure(429, {
				step,
				formError: throttled,
				values: emptyValues({
					prenom: parsed.data.prenom,
					nom: parsed.data.nom,
					email,
					phone: phone ?? ''
				})
			});
		}

		let link: string | null;
		try {
			link = await sendLink(request.headers, email, redirectTo, {
				name: fullName(parsed.data),
				phone
			});
		} catch {
			return failure(502, {
				step,
				formError: "Impossible d'envoyer le lien pour le moment. Réessaie dans un instant.",
				values: emptyValues({
					prenom: parsed.data.prenom,
					nom: parsed.data.nom,
					email,
					phone: phone ?? ''
				})
			});
		}

		// Prototype : connexion instantanée (suivi du lien) ; sinon écran « lien envoyé ».
		throw redirect(303, link ?? sentUrl(email, redirectTo));
	}
};
