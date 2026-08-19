import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import {
	assignVolunteer,
	getTournamentSignupsForOrganizer,
	moveSignup,
	removeAssignment,
	swapSignups
} from '$lib/server/services/signup-service';
import { listAssignmentLog } from '$lib/server/services/assignment-log-service';
import { attachEmail, updateManagedVolunteer } from '$lib/server/services/volunteer-directory';
import {
	assignSchema,
	attachEmailSchema,
	updateVolunteerSchema,
	moveSchema,
	removeSchema,
	swapSchema
} from '$lib/schemas/assignment';
import type { Actions, PageServerLoad } from './$types';

/** Suivi du remplissage (réservé à l'organisateur propriétaire du tournoi). */
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireOrganizer(locals);
	const tournament = await getTournamentSignupsForOrganizer(params.id, user.id);
	if (!tournament) throw error(404, 'Tournoi introuvable.');

	const history = await listAssignmentLog(params.id, user.id);

	return { tournament, history };
};

type AssignAction = 'move' | 'swap' | 'assign' | 'remove' | 'attachEmail' | 'updateVolunteer';

/** Mappe les erreurs métier d'une édition d'affectation vers une réponse de formulaire. */
function assignError(action: AssignAction, err: unknown) {
	const message = err instanceof Error ? err.message : '';
	if (message === 'NOT_FOUND') return fail(404, { action, formError: 'Affectation introuvable.' });
	if (message === 'FULL') return fail(409, { action, formError: 'Le créneau cible est complet.' });
	if (message === 'DUPLICATE') {
		return fail(409, { action, formError: 'Ce bénévole est déjà inscrit sur ce créneau.' });
	}
	if (message === 'EMAIL_TAKEN') {
		return fail(409, { action, formError: 'Cet email est déjà utilisé par un autre compte.' });
	}
	if (message === 'NOT_MANAGED') {
		return fail(409, {
			action,
			formError:
				action === 'updateVolunteer'
					? 'Ce bénévole gère lui-même son compte : seul lui peut modifier ses informations.'
					: 'Ce bénévole a déjà une adresse email personnelle.'
		});
	}
	if (message === 'RESERVED_DOMAIN') {
		return fail(400, { action, formError: 'Ce domaine est réservé. Utilise une adresse réelle.' });
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
			const res = await moveSignup(
				user.id,
				params.id,
				{ shiftId: parsed.data.shiftId, userId: parsed.data.userId },
				parsed.data.targetShiftId
			);
			return { action: 'move', success: true, notified: res.notified };
		} catch (err) {
			return assignError('move', err);
		}
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
			const res = await swapSignups(
				user.id,
				params.id,
				{ shiftId: parsed.data.aShiftId, userId: parsed.data.aUserId },
				{ shiftId: parsed.data.bShiftId, userId: parsed.data.bUserId }
			);
			return { action: 'swap', success: true, notified: res.notified };
		} catch (err) {
			return assignError('swap', err);
		}
	},

	/**
	 * Inscrire un bénévole (compte existant, ou fiche créée à la volée).
	 * `notified` et `hasRealEmail` remontent à l'UI : sans eux, l'organisateur croit que la
	 * personne a été prévenue alors qu'une fiche sans email ne recevra jamais rien.
	 */
	assign: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const mode = form.get('mode') === 'new' ? 'new' : 'existing';
		const parsed = assignSchema.safeParse(
			mode === 'existing'
				? {
						mode,
						shiftId: form.get('shiftId'),
						status: form.get('status'),
						note: form.get('note'),
						userId: form.get('userId')
					}
				: {
						mode,
						shiftId: form.get('shiftId'),
						status: form.get('status'),
						note: form.get('note'),
						name: form.get('name'),
						phone: form.get('phone'),
						email: form.get('email')
					}
		);
		if (!parsed.success) {
			return fail(400, {
				action: 'assign',
				formError: 'Inscription invalide.',
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		try {
			const res = await assignVolunteer(user.id, params.id, parsed.data);
			return {
				action: 'assign',
				success: true,
				notified: res.notified,
				hasRealEmail: res.hasRealEmail
			};
		} catch (err) {
			return assignError('assign', err);
		}
	},

	/** Retirer un bénévole d'un créneau (trace + notification). */
	remove: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const parsed = removeSchema.safeParse({
			shiftId: form.get('shiftId'),
			userId: form.get('userId'),
			reason: form.get('reason')
		});
		if (!parsed.success) return fail(400, { action: 'remove', formError: 'Retrait invalide.' });

		try {
			const res = await removeAssignment(
				user.id,
				params.id,
				{ shiftId: parsed.data.shiftId, userId: parsed.data.userId },
				parsed.data.reason
			);
			return {
				action: 'remove',
				success: true,
				notified: res.notified,
				volunteerName: res.volunteerName
			};
		} catch (err) {
			return assignError('remove', err);
		}
	},

	/**
	 * Rattacher un vrai email à une fiche : le compte devient connectable et le bénévole
	 * retrouve les créneaux déjà posés pour lui.
	 */
	attachEmail: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		// Le tournoi doit appartenir à l'organisateur : sinon n'importe quel organisateur
		// pourrait modifier l'email d'un compte via une autre page.
		const tournament = await getTournamentSignupsForOrganizer(params.id, user.id);
		if (!tournament) throw error(404, 'Tournoi introuvable.');

		const form = await request.formData();
		const parsed = attachEmailSchema.safeParse({
			userId: form.get('userId'),
			email: form.get('email')
		});
		if (!parsed.success) {
			return fail(400, { action: 'attachEmail', formError: 'Email invalide.' });
		}

		// Le bénévole doit être inscrit sur CE tournoi — on ne modifie pas un compte au hasard.
		const isOnTournament = tournament.positions.some((p) =>
			p.shifts.some((s) => s.signups.some((su) => su.userId === parsed.data.userId))
		);
		if (!isOnTournament) {
			return fail(404, { action: 'attachEmail', formError: 'Bénévole introuvable.' });
		}

		try {
			await attachEmail(parsed.data.userId, parsed.data.email);
			return { action: 'attachEmail', success: true };
		} catch (err) {
			return assignError('attachEmail', err);
		}
	},

	/**
	 * Corriger la fiche d'un bénévole créé par cet organisateur (Epic 15).
	 * Même double garde que `attachEmail` : le tournoi lui appartient, ET le bénévole y est
	 * inscrit — sans quoi la route deviendrait un éditeur d'annuaire universel. La vérification
	 * que la fiche a bien été créée par lui vit dans le service (`createdBy`).
	 */
	updateVolunteer: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const tournament = await getTournamentSignupsForOrganizer(params.id, user.id);
		if (!tournament) throw error(404, 'Tournoi introuvable.');

		const form = await request.formData();
		const parsed = updateVolunteerSchema.safeParse({
			userId: form.get('userId'),
			name: form.get('name'),
			phone: form.get('phone'),
			email: form.get('email')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'updateVolunteer',
				formError: 'Informations invalides.',
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const isOnTournament = tournament.positions.some((p) =>
			p.shifts.some((s) => s.signups.some((su) => su.userId === parsed.data.userId))
		);
		if (!isOnTournament) {
			return fail(404, { action: 'updateVolunteer', formError: 'Bénévole introuvable.' });
		}

		try {
			await updateManagedVolunteer(parsed.data.userId, user.id, parsed.data);
			return { action: 'updateVolunteer', success: true };
		} catch (err) {
			return assignError('updateVolunteer', err);
		}
	}
};
