import { fail } from '@sveltejs/kit';
import { requireSuperAdmin } from '$lib/server/auth-guard';
import {
	approveOrganizerRequest,
	createOrganizer,
	listOrganizerRequests,
	listUsers,
	rejectOrganizerRequest,
	setUserRole
} from '$lib/server/services/admin-service';
import { createOrganizerSchema, roleSchema } from '$lib/schemas/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [users, requests] = await Promise.all([listUsers(), listOrganizerRequests('pending')]);
	return { users, requests };
};

export const actions: Actions = {
	/** Change le rôle d'un utilisateur (interdit de modifier son propre rôle). */
	setRole: async ({ request, locals }) => {
		const me = requireSuperAdmin(locals);
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const parsed = roleSchema.safeParse(form.get('role'));
		if (!userId || !parsed.success) return fail(400, { error: 'Requête invalide.' });
		if (userId === me.id) return fail(400, { error: 'Tu ne peux pas modifier ton propre rôle.' });

		await setUserRole(userId, parsed.data);
		return { success: 'role' };
	},

	/** Crée (ou promeut) un compte organisateur par email. */
	createOrganizer: async ({ request, locals }) => {
		requireSuperAdmin(locals);
		const form = await request.formData();
		const parsed = createOrganizerSchema.safeParse({
			name: form.get('name'),
			email: form.get('email'),
			phone: form.get('phone')
		});
		if (!parsed.success) {
			return fail(400, {
				formErrors: parsed.error.flatten().fieldErrors,
				values: {
					name: String(form.get('name') ?? ''),
					email: String(form.get('email') ?? ''),
					phone: String(form.get('phone') ?? '')
				}
			});
		}

		const res = await createOrganizer(parsed.data);
		return { success: res.created ? 'created' : 'promoted' };
	},

	approve: async ({ request, locals }) => {
		const me = requireSuperAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('requestId') ?? '');
		if (!id) return fail(400, { error: 'Requête invalide.' });
		await approveOrganizerRequest(id, me.id);
		return { success: 'approved' };
	},

	reject: async ({ request, locals }) => {
		const me = requireSuperAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('requestId') ?? '');
		if (!id) return fail(400, { error: 'Requête invalide.' });
		await rejectOrganizerRequest(id, me.id);
		return { success: 'rejected' };
	}
};
