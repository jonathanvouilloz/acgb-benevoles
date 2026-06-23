import { json, error } from '@sveltejs/kit';
import { pushSubscriptionSchema } from '$lib/schemas/push';
import { savePushSubscription, deletePushSubscription } from '$lib/server/services/push-service';
import type { RequestHandler } from './$types';

/** Enregistre la souscription Web Push du bénévole connecté. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Connexion requise.');

	const parsed = pushSubscriptionSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Souscription invalide.');

	await savePushSubscription(locals.user.id, parsed.data);
	return json({ ok: true }, { status: 201 });
};

/** Désabonne un appareil (suppression par endpoint). */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Connexion requise.');

	const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
	const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;
	if (!endpoint) throw error(400, 'Endpoint manquant.');

	await deletePushSubscription(endpoint);
	return json({ ok: true });
};
