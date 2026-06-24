import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import {
	getTournamentSignupsForOrganizer,
	moveSignup,
	swapSignups
} from '$lib/server/services/signup-service';
import { moveSchema, swapSchema } from '$lib/schemas/assignment';
import type { Actions, PageServerLoad } from './$types';

/** Suivi du remplissage (réservé à l'organisateur propriétaire du tournoi). */
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireOrganizer(locals);
	const tournament = await getTournamentSignupsForOrganizer(params.id, user.id);
	if (!tournament) throw error(404, 'Tournoi introuvable.');

	return { tournament };
};

/** Mappe les erreurs métier d'une édition d'affectation vers une réponse de formulaire. */
function assignError(action: 'move' | 'swap', err: unknown) {
	const message = err instanceof Error ? err.message : '';
	if (message === 'NOT_FOUND') return fail(404, { action, formError: 'Affectation introuvable.' });
	if (message === 'FULL') return fail(409, { action, formError: 'Le créneau cible est complet.' });
	if (message === 'DUPLICATE') {
		return fail(409, { action, formError: 'Ce bénévole est déjà inscrit sur ce créneau.' });
	}
	throw err;
}

export const actions: Actions = {
	move: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const parsed = moveSchema.safeParse({
			shiftId: form.get('shiftId'),
			userId: form.get('userId'),
			targetShiftId: form.get('targetShiftId')
		});
		if (!parsed.success) return fail(400, { action: 'move', formError: 'Déplacement invalide.' });

		try {
			await moveSignup(
				user.id,
				params.id,
				{ shiftId: parsed.data.shiftId, userId: parsed.data.userId },
				parsed.data.targetShiftId
			);
		} catch (err) {
			return assignError('move', err);
		}
		return { action: 'move', success: true };
	},

	swap: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const parsed = swapSchema.safeParse({
			aShiftId: form.get('aShiftId'),
			aUserId: form.get('aUserId'),
			bShiftId: form.get('bShiftId'),
			bUserId: form.get('bUserId')
		});
		if (!parsed.success) return fail(400, { action: 'swap', formError: 'Échange invalide.' });

		try {
			await swapSignups(
				user.id,
				params.id,
				{ shiftId: parsed.data.aShiftId, userId: parsed.data.aUserId },
				{ shiftId: parsed.data.bShiftId, userId: parsed.data.bUserId }
			);
		} catch (err) {
			return assignError('swap', err);
		}
		return { action: 'swap', success: true };
	}
};
