import { error } from '@sveltejs/kit';
import { Receiver } from '@upstash/qstash';
import { env } from '$env/dynamic/private';
import { processSignupReminder, type ReminderKind } from '$lib/server/services/reminder-service';
import type { RequestHandler } from './$types';

/**
 * Récepteur des messages QStash (planifiés par reminder-scheduler). QStash POST ici à
 * l'échéance de chaque palier. On vérifie la signature `Upstash-Signature`, puis on délègue
 * à `processSignupReminder` qui re-valide l'état de l'inscription et envoie (ou drop).
 *
 * On répond **200 quel que soit le résultat** (sent ou dropped) : un message légitimement
 * obsolète ne doit pas être rejoué. Seuls une signature invalide (401) ou une absence de
 * configuration (503) renvoient une erreur — QStash retentera alors.
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
	// URL cible telle que QStash l'a reçue (doit matcher la signature) — cf. callbackUrl du scheduler.
	const url = `${(env.BETTER_AUTH_URL ?? '').replace(/\/$/, '')}/api/qstash/reminder`;

	const valid = await rec.verify({ body, signature, url }).catch(() => false);
	if (!valid) throw error(401, 'Signature QStash invalide.');

	let payload: {
		signupId?: unknown;
		kind?: unknown;
		expectedStartsAtMs?: unknown;
		leadMin?: unknown;
	};
	try {
		payload = JSON.parse(body);
	} catch {
		return new Response('bad-payload', { status: 200 });
	}

	const { signupId, kind, expectedStartsAtMs, leadMin } = payload;
	// `kind` court renommé `'30min'` → `'short'` : les messages en vol planifiés avant ce
	// déploiement portent l'ancien `'30min'` et tombent ici en `invalid` (200 → drop propre).
	if (
		typeof signupId !== 'string' ||
		(kind !== '24h' && kind !== 'short') ||
		typeof expectedStartsAtMs !== 'number'
	) {
		return new Response('invalid', { status: 200 });
	}
	// Le délai porté par le message ne sert qu'au libellé ; on accepte tout entier positif et
	// borné (l'ensemble autorisé est verrouillé à l'écriture côté `/compte`). Absent/invalide →
	// laisse `processSignupReminder` retomber sur le défaut.
	const lead =
		typeof leadMin === 'number' && leadMin > 0 && leadMin <= 1440 ? leadMin : undefined;

	const result = await processSignupReminder(
		signupId,
		kind as ReminderKind,
		expectedStartsAtMs,
		lead
	);
	return new Response(result, { status: 200 });
};
