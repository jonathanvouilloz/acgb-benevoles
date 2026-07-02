import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
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
	return { me, prototype: isPrototype, role: locals.user.role };
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
	}
};
