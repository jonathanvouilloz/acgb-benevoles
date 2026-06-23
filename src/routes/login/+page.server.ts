import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { loginSchema, fullName } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

/** Déjà connecté → pas de raison de rester sur /login. */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
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

		try {
			await auth.api.signInMagicLink({
				body: {
					email,
					name: fullName(parsed.data),
					callbackURL: '/',
					errorCallbackURL: '/login?error=expired'
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
