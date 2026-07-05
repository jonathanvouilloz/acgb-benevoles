import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { sendDueReminders } from '$lib/server/services/reminder-service';
import type { RequestHandler } from './$types';

/**
 * Sweep de secours des rappels push (balayage par fenêtre). **Plus programmé** : depuis la
 * migration vers QStash (planification événementielle, cf. reminder-scheduler), les rappels
 * partent à l'inscription. Cet endpoint reste comme filet manuel — déclenchable au besoin
 * (`Authorization: Bearer $CRON_SECRET`, ex. pinger externe) pour rattraper un éventuel raté.
 * Refusé si `CRON_SECRET` n'est pas configuré (fail-safe).
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
