import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { accountSchema } from '$lib/schemas/account';
import { isPrototype } from '$lib/server/prototype';
import type { Actions, PageServerLoad } from './$types';

/** Page paramètres — réservée à l'utilisateur connecté (bénévole ou organisateur). */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?redirect=/compte');

	const row = await db
		.select({ name: user.name, email: user.email, phone: user.phone })
		.from(user)
		.where(eq(user.id, locals.user.id))
		.limit(1);

	const me = row[0] ?? { name: locals.user.name, email: locals.user.email, phone: null };
	// En mode prototype, on expose la bascule de rôle (organisateur ↔ bénévole) pour tout tester.
	return { me, prototype: isPrototype, isOrganizer: locals.user.isOrganizer };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login?redirect=/compte');

		const form = await request.formData();
		const parsed = accountSchema.safeParse({
			name: form.get('name'),
			phone: form.get('phone')
		});

		if (!parsed.success) {
			const { fieldErrors } = parsed.error.flatten();
			return fail(400, {
				errors: fieldErrors,
				values: {
					name: String(form.get('name') ?? ''),
					phone: String(form.get('phone') ?? '')
				}
			});
		}

		await db
			.update(user)
			.set({ name: parsed.data.name, phone: parsed.data.phone ?? null, updatedAt: new Date() })
			.where(eq(user.id, locals.user.id));

		return { success: true };
	},

	/**
	 * Bascule de rôle réservée au mode prototype (démo). Permet à un seul testeur d'essayer
	 * le parcours organisateur ET bénévole. Hors prototype : route inexistante (403).
	 */
	toggleRole: async ({ locals }) => {
		if (!isPrototype) throw error(403, 'Indisponible.');
		if (!locals.user) throw redirect(303, '/login?redirect=/compte');

		await db
			.update(user)
			.set({ isOrganizer: !locals.user.isOrganizer, updatedAt: new Date() })
			.where(eq(user.id, locals.user.id));

		return { roleChanged: true };
	}
};
