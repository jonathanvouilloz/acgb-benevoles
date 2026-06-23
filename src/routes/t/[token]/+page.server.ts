import { error, fail } from '@sveltejs/kit';
import { requireLogin } from '$lib/server/auth-guard';
import { signupSchema } from '$lib/schemas/signup';
import {
	getTournamentByShareToken,
	createSignup,
	changeSignupStatus,
	deleteSignup
} from '$lib/server/services/signup-service';
import type { Actions, PageServerLoad } from './$types';

/** Lecture publique : pas de garde. Si connecté, `myStatus` est calculé par le service. */
export const load: PageServerLoad = async ({ locals, params }) => {
	const tournament = await getTournamentByShareToken(params.token, locals.user?.id ?? null);
	if (!tournament) throw error(404, 'Tournoi introuvable.');

	return {
		tournament,
		isLoggedIn: !!locals.user,
		me: locals.user ? { id: locals.user.id, name: locals.user.name } : null
	};
};

/** Mappe les erreurs métier du service vers une réponse de formulaire. */
function signupError(action: string, shiftId: string, err: unknown) {
	const message = err instanceof Error ? err.message : '';
	if (message === 'NOT_FOUND') throw error(404, 'Créneau introuvable.');
	if (message === 'FULL') {
		return fail(409, { action, shiftId, formError: 'Ce créneau est complet.' });
	}
	if (message === 'DUPLICATE') {
		// Double soumission / UI périmée : l'inscription existe déjà → idempotent.
		return { action, shiftId, success: true };
	}
	throw err;
}

export const actions: Actions = {
	signup: async ({ request, locals, params }) => {
		const user = requireLogin(locals, `/t/${params.token}`);
		const form = await request.formData();
		const parsed = signupSchema.safeParse({
			shiftId: String(form.get('shiftId') ?? ''),
			status: String(form.get('status') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'signup',
				shiftId: String(form.get('shiftId') ?? ''),
				formError: 'Inscription invalide.'
			});
		}

		try {
			await createSignup(parsed.data.shiftId, user.id, parsed.data.status);
		} catch (err) {
			return signupError('signup', parsed.data.shiftId, err);
		}
		return { action: 'signup', shiftId: parsed.data.shiftId, success: true };
	},

	changeStatus: async ({ request, locals, params }) => {
		const user = requireLogin(locals, `/t/${params.token}`);
		const form = await request.formData();
		const parsed = signupSchema.safeParse({
			shiftId: String(form.get('shiftId') ?? ''),
			status: String(form.get('status') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'changeStatus',
				shiftId: String(form.get('shiftId') ?? ''),
				formError: 'Changement invalide.'
			});
		}

		try {
			await changeSignupStatus(parsed.data.shiftId, user.id, parsed.data.status);
		} catch (err) {
			const mapped = signupError('changeStatus', parsed.data.shiftId, err);
			// Pour `available` complet, message plus précis.
			if (mapped && 'formError' in mapped) {
				return fail(409, {
					action: 'changeStatus',
					shiftId: parsed.data.shiftId,
					formError: 'Plus de place disponible pour « Disponible ».'
				});
			}
			return mapped;
		}
		return { action: 'changeStatus', shiftId: parsed.data.shiftId, success: true };
	},

	unregister: async ({ request, locals, params }) => {
		const user = requireLogin(locals, `/t/${params.token}`);
		const form = await request.formData();
		const shiftId = String(form.get('shiftId') ?? '');
		const parsed = signupSchema.pick({ shiftId: true }).safeParse({ shiftId });
		if (!parsed.success) {
			return fail(400, { action: 'unregister', shiftId, formError: 'Créneau invalide.' });
		}

		await deleteSignup(parsed.data.shiftId, user.id);
		return { action: 'unregister', shiftId: parsed.data.shiftId, success: true };
	}
};
