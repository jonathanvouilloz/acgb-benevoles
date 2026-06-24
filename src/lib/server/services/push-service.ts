import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { pushSubscription } from '$lib/server/db/schema';
import type { PushSubscription } from '$lib/server/db/schema';
import type { PushSubscriptionInput } from '$lib/schemas/push';

/**
 * Couche Web Push (VAPID). Gère la persistance des souscriptions et l'envoi des
 * notifications. Configuré paresseusement pour éviter une erreur au build si les clés
 * VAPID ne sont pas encore renseignées (cf. pattern de `email.ts`).
 */

/** Payload affiché par le service worker (cf. handler `push` de src/service-worker.ts). */
export type PushPayload = { title: string; body: string; url: string };

let configured = false;

/** Configure web-push une seule fois. Lève si les clés VAPID manquent. */
function ensureConfigured(): void {
	if (configured) return;
	const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		throw new Error('Clés VAPID manquantes : impossible d’envoyer une notification push.');
	}
	webpush.setVapidDetails(
		VAPID_SUBJECT ?? 'mailto:contact@acgb.ch',
		VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY
	);
	configured = true;
}

/**
 * Enregistre (ou rafraîchit) la souscription d'un utilisateur. Upsert sur `endpoint` :
 * une re-souscription du même appareil met à jour les clés au lieu de créer un doublon.
 */
export async function savePushSubscription(
	userId: string,
	sub: PushSubscriptionInput
): Promise<void> {
	await db
		.insert(pushSubscription)
		.values({
			userId,
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth
		})
		.onConflictDoUpdate({
			target: pushSubscription.endpoint,
			set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }
		});
}

/** Supprime une souscription par son endpoint (désabonnement client ou abonnement mort). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
	await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
}

/**
 * Envoie une notification à une souscription. Sur 404/410 (abonnement expiré côté
 * navigateur), nettoie la ligne en base. Les autres erreurs sont avalées (best-effort)
 * pour ne pas interrompre l'envoi en lot des rappels.
 */
export async function sendPush(sub: PushSubscription, payload: PushPayload): Promise<boolean> {
	ensureConfigured();
	try {
		await webpush.sendNotification(
			{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
			JSON.stringify(payload)
		);
		return true;
	} catch (err) {
		const statusCode = (err as { statusCode?: number }).statusCode;
		if (statusCode === 404 || statusCode === 410) {
			await deletePushSubscription(sub.endpoint);
		}
		return false;
	}
}
