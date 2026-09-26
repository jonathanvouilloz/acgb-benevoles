import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { safeRedirect } from '$lib/server/auth-guard';
import { codeLoginSchema } from '$lib/schemas/auth';
import { peekPendingProfile } from '$lib/server/services/pending-profile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'));
	// Connecté entre-temps (lien cliqué dans ce navigateur) → on rejoint la cible.
	if (locals.user) throw redirect(303, redirectTo ?? '/');
	return { email: url.searchParams.get('email'), redirect: redirectTo };
};

/** Codes d'erreur du plugin emailOTP → message. Un code inconnu retombe sur « invalide ». */
const CODE_ERRORS: Record<string, string> = {
	OTP_EXPIRED: 'Ce code a expiré. Renvoie-toi un lien ci-dessous.',
	TOO_MANY_ATTEMPTS: 'Trop d’essais avec ce code. Renvoie-toi un lien ci-dessous.',
	// Compte à créer mais profil en attente expiré : il faut ressaisir nom et téléphone.
	MISSING_FIELD: 'Ton inscription a expiré. Renvoie-toi un lien ci-dessous pour la reprendre.'
};

export const actions: Actions = {
	/**
	 * Connexion par le code à 6 chiffres. Chemin de la PWA installée sur iOS : son stockage est
	 * isolé de Safari, où s'ouvrirait le lien. Les cookies de session sont reportés sur la
	 * réponse par le plugin `sveltekitCookies` (cf. auth.ts).
	 */
	default: async ({ request }) => {
		const form = await request.formData();
		const redirectTo = safeRedirect(form.get('redirect')) ?? '/';
		const parsed = codeLoginSchema.safeParse({ email: form.get('email'), code: form.get('code') });
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { codeError: errors.code?.[0] ?? errors.email?.[0] ?? 'Code invalide' });
		}

		// Nouveau compte : le plugin exige `phone` (champ requis) dans le body, avant le hook de
		// création — on y remet le profil saisi à l'étape 2 de /login. Ignoré si le compte existe.
		const profile = await peekPendingProfile(parsed.data.email);
		try {
			await auth.api.signInEmailOTP({
				body: { email: parsed.data.email, otp: parsed.data.code, ...(profile ?? {}) },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				const code = String((err.body as { code?: string } | undefined)?.code ?? '');
				return fail(400, {
					codeError: CODE_ERRORS[code] ?? 'Code incorrect. Vérifie-le et réessaie.'
				});
			}
			throw err;
		}
		throw redirect(303, redirectTo);
	}
};
