import { error } from '@sveltejs/kit';
import { Receiver } from '@upstash/qstash';
import { env } from '$env/dynamic/private';
import { processDigest } from '$lib/server/services/digest-service';
import { DIGEST_CALLBACK_PATH } from '$lib/server/services/digest-scheduler';
import { publicUrl } from '$lib/server/services/qstash';
import type { RequestHandler } from './$types';

/**
 * Récepteur des messages de récap (planifiés par `digest-scheduler`). Décalque de
 * `api/qstash/reminder`, avec une différence assumée : `send-failed` renvoie **500** pour que
 * QStash retente.
 *
 * Pourquoi cette entorse au « toujours 200 » du récepteur de rappels : un rappel manqué est
 * rattrapé par le palier suivant, alors qu'un récap manqué est perdu jusqu'au prochain
 * changement du bénévole — c'est-à-dire potentiellement jamais.
 *
 * **Endpoint distinct obligatoire** : `Receiver.verify()` vérifie l'URL cible contre la
 * signature. Partager la route des rappels imposerait de discriminer sur le payload et de
 * mélanger deux politiques de drop.
 */

let resolved = false;
let receiver: Receiver | null = null;

function getReceiver(): Receiver | null {
	if (!resolved) {
		resolved = true;
		const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY;
		const nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY;
		receiver =
			currentSigningKey && nextSigningKey
				? new Receiver({ currentSigningKey, nextSigningKey })
				: null;
	}
	return receiver;
}

export const POST: RequestHandler = async ({ request }) => {
	const rec = getReceiver();
	if (!rec) throw error(503, 'QStash non configuré.');

	const body = await request.text();
	const signature = request.headers.get('upstash-signature') ?? '';
	// L'URL doit être exactement celle utilisée à la publication : un `BETTER_AUTH_URL` désaligné
	// produit des 401 en série, sans aucune erreur visible côté app (juste zéro email).
	const url = publicUrl(DIGEST_CALLBACK_PATH);

	const valid = await rec.verify({ body, signature, url }).catch(() => false);
	if (!valid) throw error(401, 'Signature QStash invalide.');

	let payload: { userId?: unknown; tournamentId?: unknown; revision?: unknown };
	try {
		payload = JSON.parse(body);
	} catch {
		return new Response('bad-payload', { status: 200 });
	}

	const { userId, tournamentId, revision } = payload;
	if (
		typeof userId !== 'string' ||
		typeof tournamentId !== 'string' ||
		typeof revision !== 'number' ||
		!Number.isInteger(revision) ||
		revision < 1
	) {
		return new Response('invalid', { status: 200 });
	}

	const result = await processDigest(userId, tournamentId, revision);
	// Seul l'échec récupérable mérite un retry ; tous les autres verdicts sont des fins normales.
	if (result === 'send-failed') throw error(500, 'Envoi du récap échoué.');
	return new Response(result, { status: 200 });
};
