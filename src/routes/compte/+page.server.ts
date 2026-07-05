import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { accountSchema } from '$lib/schemas/account';
import { DEFAULT_REMINDER_LEAD_MIN, isReminderLead } from '$lib/reminders';
import { isPrototype } from '$lib/server/prototype';
import {
	createOrganizerRequest,
	getMyLatestRequest
} from '$lib/server/services/organizer-request-service';
import type { Actions, PageServerLoad } from './$types';

/** Page paramètres — réservée à l'utilisateur connecté (bénévole ou organisateur). */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?redirect=/compte');

	const row = await db
		.select({
			name: user.name,
			email: user.email,
			phone: user.phone,
			reminderLeadMin: user.reminderLeadMin
		})
		.from(user)
		.where(eq(user.id, locals.user.id))
		.limit(1);

	const me = row[0] ?? {
		name: locals.user.name,
		email: locals.user.email,
		phone: null,
		reminderLeadMin: DEFAULT_REMINDER_LEAD_MIN
	};
	// Un bénévole peut demander à devenir organisateur : on remonte sa dernière demande (statut).
	const organizerRequest =
		locals.user.role === 'volunteer' ? await getMyLatestRequest(locals.user.id) : null;

	return { me, prototype: isPrototype, role: locals.user.role, organizerRequest };
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
	 * Réglage du délai du rappel court (15/30/60 min). V1 : ne s'applique qu'aux **futures**
	 * inscriptions — les rappels déjà planifiés (QStash) portent l'ancien délai et ne sont pas
	 * reprogrammés (cf. docs/features/06-notifications.md).
	 */
	saveReminderLead: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login?redirect=/compte');

		const form = await request.formData();
		const leadMin = Number(form.get('reminderLeadMin'));
		if (!isReminderLead(leadMin)) {
			return fail(400, { reminderError: 'Délai invalide.' });
		}

		await db
			.update(user)
			.set({ reminderLeadMin: leadMin, updatedAt: new Date() })
			.where(eq(user.id, locals.user.id));

		return { reminderSaved: true, reminderLeadMin: leadMin };
	},

	/** Bénévole : demande de promotion organisateur (traitée ensuite par un super admin). */
	requestOrganizer: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login?redirect=/compte');
		if (locals.user.role !== 'volunteer') {
			return fail(400, { requestError: 'Ton compte a déjà accès à l’organisation.' });
		}

		const form = await request.formData();
		const message = String(form.get('message') ?? '').slice(0, 500);
		const created = await createOrganizerRequest(locals.user.id, message);
		if (!created) return fail(400, { requestError: 'Une demande est déjà en attente.' });

		return { requestSent: true };
	}
};
