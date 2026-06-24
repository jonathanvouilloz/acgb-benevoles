import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { loginSchema, emailLoginSchema, fullName } from '$lib/schemas/auth';
import { safeRedirect } from '$lib/server/auth-guard';
import { isPrototype, takePrototypeLink } from '$lib/server/prototype';
import type { Actions, PageServerLoad } from './$types';

/** Déjà connecté → pas de raison de rester sur /login (on rejoint la cible éventuelle). */
export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'));
	if (locals.user) throw redirect(303, redirectTo ?? '/');
	return { redirect: redirectTo, prototype: isPrototype };
};

type Mode = 'login' | 'signup';
type Errors = Record<string, string[] | undefined> | undefined;
type Values = { prenom: string; nom: string; email: string; phone: string };

/** Réponse d'échec à forme uniforme (un seul type ActionData côté page). */
function failure(
	status: number,
	payload: { mode: Mode; errors?: Errors; values: Values; formError?: string; notFound?: boolean }
) {
	return fail(status, {
		mode: payload.mode,
		errors: payload.errors ?? undefined,
		values: payload.values,
		formError: payload.formError ?? undefined,
		notFound: payload.notFound ?? false
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
 * Génère le magic link. Comportement normal : email envoyé → on retourne `null`
 * (le flux continue vers « lien envoyé »). En mode prototype : aucun email, on retourne
 * l'URL de vérification capturée pour la suivre tout de suite (connexion instantanée).
 */
async function sendLink(
	headers: Headers,
	email: string,
	redirectTo: string,
	extra: { name?: string; phone?: string } = {}
): Promise<string | null> {
	await auth.api.signInMagicLink({
		body: {
			email,
			...(extra.name ? { name: extra.name } : {}),
			...(extra.phone ? { phone: extra.phone } : {}),
			callbackURL: redirectTo,
			errorCallbackURL: `/login?error=expired&redirect=${encodeURIComponent(redirectTo)}`
		},
		headers
	});
	return isPrototype ? (takePrototypeLink(email) ?? null) : null;
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const mode: Mode = form.get('mode') === 'signup' ? 'signup' : 'login';
		const redirectTo = safeRedirect(form.get('redirect')) ?? '/';

		// --- Connexion simple (compte existant) : email seul ---
		if (mode === 'login') {
			const parsed = emailLoginSchema.safeParse({ email: form.get('email') });
			if (!parsed.success) {
				return failure(400, {
					mode,
					errors: parsed.error.flatten().fieldErrors,
					values: emptyValues({ email: String(form.get('email') ?? '') })
				});
			}
			const { email } = parsed.data;

			// On ne crée pas de compte ici : si l'email est inconnu, on invite à créer un compte.
			const existing = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, email))
				.limit(1);
			if (existing.length === 0) {
				return failure(400, {
					mode,
					notFound: true,
					formError: 'Aucun compte avec cet email. Crée ton compte ci-dessous.',
					values: emptyValues({ email })
				});
			}

			let link: string | null;
			try {
				link = await sendLink(request.headers, email, redirectTo);
			} catch {
				return failure(502, {
					mode,
					formError: "Impossible d'envoyer le lien pour le moment. Réessaie dans un instant.",
					values: emptyValues({ email })
				});
			}
			// Prototype : connexion instantanée (suivi du lien) ; sinon écran « lien envoyé ».
			throw redirect(303, link ?? `/login/sent?email=${encodeURIComponent(email)}`);
		}

		// --- Création de compte / première connexion : prénom + nom + email + tél ---
		const parsed = loginSchema.safeParse({
			prenom: form.get('prenom'),
			nom: form.get('nom'),
			email: form.get('email'),
			phone: form.get('phone')
		});

		if (!parsed.success) {
			return failure(400, {
				mode,
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

		let link: string | null;
		try {
			link = await sendLink(request.headers, email, redirectTo, {
				name: fullName(parsed.data),
				phone
			});
		} catch {
			return failure(502, {
				mode,
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
		throw redirect(303, link ?? `/login/sent?email=${encodeURIComponent(email)}`);
	}
};
