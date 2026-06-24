import { error, fail, redirect } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import { tournamentSchema } from '$lib/schemas/tournament';
import { positionSchema } from '$lib/schemas/position';
import { shiftSchema } from '$lib/schemas/shift';
import {
	getTournamentForOrganizer,
	updateTournament,
	deleteTournament
} from '$lib/server/services/tournament-service';
import {
	createPosition,
	updatePosition,
	deletePosition
} from '$lib/server/services/position-service';
import { createShift, updateShift, deleteShift } from '$lib/server/services/shift-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireOrganizer(locals);
	const tournament = await getTournamentForOrganizer(params.id, user.id);
	if (!tournament) throw error(404, 'Tournoi introuvable.');
	return { tournament };
};

/** Convertit une erreur d'autorisation service en réponse 403 ; relance le reste. */
function forbidden(action: string) {
	return fail(403, { action, formError: 'Action non autorisée.' });
}

export const actions: Actions = {
	updateTournament: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const values = {
			name: String(form.get('name') ?? ''),
			location: String(form.get('location') ?? ''),
			startDate: String(form.get('startDate') ?? ''),
			endDate: String(form.get('endDate') ?? '')
		};
		const parsed = tournamentSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				action: 'updateTournament',
				errors: parsed.error.flatten().fieldErrors,
				values
			});
		}
		const row = await updateTournament(params.id, user.id, parsed.data);
		if (!row) throw error(404, 'Tournoi introuvable.');
		return { action: 'updateTournament', success: true };
	},

	deleteTournament: async ({ locals, params }) => {
		const user = requireOrganizer(locals);
		await deleteTournament(params.id, user.id);
		throw redirect(303, '/tournois');
	},

	createPositions: async ({ request, locals, params }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();

		// Presets sélectionnés + champ custom arrivent tous sous le champ `names`.
		const names = form
			.getAll('names')
			.map((n) => String(n).trim())
			.filter(Boolean);

		if (names.length === 0) {
			return fail(400, {
				action: 'createPositions',
				errors: { names: ['Sélectionne au moins un poste.'] }
			});
		}

		// Valide chaque nom (réutilise les règles de positionSchema).
		for (const name of names) {
			const parsed = positionSchema.safeParse({ name });
			if (!parsed.success) {
				const msg = parsed.error.flatten().fieldErrors.name?.[0] ?? 'Nom de poste invalide.';
				return fail(400, { action: 'createPositions', errors: { names: [msg] } });
			}
		}

		try {
			// Création séquentielle : `assignPosteColor` recompte à chaque insert → couleurs distinctes.
			for (const name of names) {
				await createPosition(params.id, user.id, { name });
			}
		} catch {
			return forbidden('createPositions');
		}
		return { action: 'createPositions', success: true };
	},

	updatePosition: async ({ request, locals }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const positionId = String(form.get('positionId') ?? '');
		const values = {
			name: String(form.get('name') ?? ''),
			description: String(form.get('description') ?? '')
		};
		const parsed = positionSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				action: 'updatePosition',
				positionId,
				errors: parsed.error.flatten().fieldErrors,
				values
			});
		}
		try {
			await updatePosition(positionId, user.id, parsed.data);
		} catch {
			return forbidden('updatePosition');
		}
		return { action: 'updatePosition', positionId, success: true };
	},

	deletePosition: async ({ request, locals }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const positionId = String(form.get('positionId') ?? '');
		try {
			await deletePosition(positionId, user.id);
		} catch {
			return forbidden('deletePosition');
		}
		return { action: 'deletePosition', success: true };
	},

	createShift: async ({ request, locals }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const positionId = String(form.get('positionId') ?? '');
		const values = {
			day: String(form.get('day') ?? ''),
			startTime: String(form.get('startTime') ?? ''),
			endTime: String(form.get('endTime') ?? ''),
			capacity: String(form.get('capacity') ?? '')
		};
		const parsed = shiftSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				action: 'createShift',
				positionId,
				errors: parsed.error.flatten().fieldErrors,
				values
			});
		}
		try {
			await createShift(positionId, user.id, parsed.data);
		} catch {
			return forbidden('createShift');
		}
		return { action: 'createShift', positionId, success: true };
	},

	updateShift: async ({ request, locals }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const shiftId = String(form.get('shiftId') ?? '');
		const values = {
			day: String(form.get('day') ?? ''),
			startTime: String(form.get('startTime') ?? ''),
			endTime: String(form.get('endTime') ?? ''),
			capacity: String(form.get('capacity') ?? '')
		};
		const parsed = shiftSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				action: 'updateShift',
				shiftId,
				errors: parsed.error.flatten().fieldErrors,
				values
			});
		}
		try {
			await updateShift(shiftId, user.id, parsed.data);
		} catch {
			return forbidden('updateShift');
		}
		return { action: 'updateShift', shiftId, success: true };
	},

	deleteShift: async ({ request, locals }) => {
		const user = requireOrganizer(locals);
		const form = await request.formData();
		const shiftId = String(form.get('shiftId') ?? '');
		try {
			await deleteShift(shiftId, user.id);
		} catch {
			return forbidden('deleteShift');
		}
		return { action: 'deleteShift', success: true };
	}
};
