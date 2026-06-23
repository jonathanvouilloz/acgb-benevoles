import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { sendDueReminders } from '$lib/server/services/reminder-service';
import type { RequestHandler } from './$types';

/**
 * Endpoint d'envoi des rappels push (Epic 6). Déclencheur **agnostique** : Vercel Cron
 * (cf. vercel.json) ou tout pinger externe (cron-job.org, GitHub Actions…). Protégé par
 * `Authorization: Bearer $CRON_SECRET` — que Vercel Cron envoie automatiquement si la var
 * est définie. Si `CRON_SECRET` n'est pas configuré, l'endpoint est refusé (fail-safe).
 */
export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	if (!secret) throw error(503, 'CRON_SECRET non configuré.');
	if (request.headers.get('authorization') !== `Bearer ${secret}`) {
		throw error(401, 'Non autorisé.');
	}

	const result = await sendDueReminders(new Date());
	return json(result);
};
