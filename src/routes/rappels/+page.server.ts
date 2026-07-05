import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { DEFAULT_REMINDER_LEAD_MIN, isReminderLead } from '$lib/reminders';
import type { Actions, PageServerLoad } from './$types';

/** Page réglages des rappels push — réservée à l'utilisateur connecté. */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?redirect=/rappels');

	const row = await db
		.select({ reminderLeadMin: user.reminderLeadMin })
		.from(user)
		.where(eq(user.id, locals.user.id))
		.limit(1);

	return { reminderLeadMin: row[0]?.reminderLeadMin ?? DEFAULT_REMINDER_LEAD_MIN };
};

export const actions: Actions = {
	/**
	 * Réglage du délai du rappel court (15/30/60 min). V1 : ne s'applique qu'aux **futures**
	 * inscriptions — les rappels déjà planifiés (QStash) portent l'ancien délai et ne sont pas
	 * reprogrammés (cf. docs/features/06-notifications.md).
	 */
	saveReminderLead: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login?redirect=/rappels');

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
	}
};
