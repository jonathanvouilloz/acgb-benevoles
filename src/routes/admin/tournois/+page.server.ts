import { fail } from '@sveltejs/kit';
import { requireSuperAdmin } from '$lib/server/auth-guard';
import { deleteTournamentAsAdmin, listAllTournaments } from '$lib/server/services/admin-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const tournaments = await listAllTournaments();
	return { tournaments };
};

export const actions: Actions = {
	deleteTournament: async ({ request, locals }) => {
		requireSuperAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('tournamentId') ?? '');
		if (!id) return fail(400, { error: 'Requête invalide.' });
		const ok = await deleteTournamentAsAdmin(id);
		if (!ok) return fail(404, { error: 'Tournoi introuvable.' });
		return { success: true };
	}
};
