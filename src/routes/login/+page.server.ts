import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { loginSchema, fullName } from '$lib/schemas/auth';
import { safeRedirect } from '$lib/server/auth-guard';
import type { Actions, PageServerLoad } from './$types';

/** Déjà connecté → pas de raison de rester sur /login (on rejoint la cible éventuelle). */
export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'));
	if (locals.user) throw redirect(303, redirectTo ?? '/');
	return { redirect: redirectTo };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const parsed = loginSchema.safeParse({
			prenom: form.get('prenom'),
			nom: form.get('nom'),
			email: form.get('email')
		});

		if (!parsed.success) {
			const { fieldErrors } = parsed.error.flatten();
			return fail(400, {
				errors: fieldErrors,
				values: {
					prenom: String(form.get('prenom') ?? ''),
					nom: String(form.get('nom') ?? ''),
					email: String(form.get('email') ?? '')
				}
			});
		}

		const { email } = parsed.data;

		// Cible interne à rejoindre après le clic sur le lien magique (sinon accueil).
		const redirectTo = safeRedirect(form.get('redirect')) ?? '/';

		try {
			await auth.api.signInMagicLink({
				body: {
					email,
					name: fullName(parsed.data),
					callbackURL: redirectTo,
					errorCallbackURL: `/login?error=expired&redirect=${encodeURIComponent(redirectTo)}`
				},
				headers: request.headers
			});
		} catch {
			return fail(502, {
				formError: "Impossible d'envoyer le lien pour le moment. Réessaie dans un instant.",
				values: { prenom: parsed.data.prenom, nom: parsed.data.nom, email }
			});
		}

		throw redirect(303, `/login/sent?email=${encodeURIComponent(email)}`);
	}
};
