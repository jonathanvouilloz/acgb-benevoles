import { fail, redirect } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import { tournamentSchema } from '$lib/schemas/tournament';
import { createTournament } from '$lib/server/services/tournament-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireOrganizer(locals);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
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
			return fail(400, { errors: parsed.error.flatten().fieldErrors, values });
		}

		const created = await createTournament(user.id, parsed.data);
		throw redirect(303, `/tournois/${created.id}`);
	}
};
