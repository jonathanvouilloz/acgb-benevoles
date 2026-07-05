import { and, eq } from 'drizzle-orm';
import { Client } from '@upstash/qstash';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { signup, shift } from '$lib/server/db/schema';
import type { ReminderKind } from './reminder-service';

/**
 * Planification événementielle des rappels via Upstash QStash (remplace le cron poll).
 *
 * Au moment où une inscription `available` naît ou que son créneau bouge, on publie 2 messages
 * différés (24h et 30min avant `shift.startsAt`) que QStash livrera à l'heure pile sur
 * `POST /api/qstash/reminder`. On ne planifie **que** ; jamais on n'annule : l'endpoint
 * re-valide l'état à la livraison et drop si le rappel n'est plus pertinent (cf. reminder-service).
 *
 * Best-effort intégral : lecture paresseuse du token (no-op si QStash non configuré, ex. dev
 * local), et aucune erreur ne remonte — une panne QStash ne doit jamais bloquer une inscription.
 */

const PALIERS: { kind: ReminderKind; minutes: number }[] = [
	{ kind: '24h', minutes: 24 * 60 },
	{ kind: '30min', minutes: 30 }
];

let resolved = false;
let client: Client | null = null;

/** Client QStash mémoïsé, ou `null` si `QSTASH_TOKEN` absent (dev sans QStash → planif ignorée). */
function getClient(): Client | null {
	if (!resolved) {
		resolved = true;
		client = env.QSTASH_TOKEN
			? new Client({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL || undefined })
			: null;
	}
	return client;
}

/** URL publique appelée par QStash. QStash n'atteint pas localhost → HTTPS public requis en prod. */
function callbackUrl(): string {
	const base = (env.BETTER_AUTH_URL ?? '').replace(/\/$/, '');
	return `${base}/api/qstash/reminder`;
}

/** Publie les 2 messages différés pour une inscription, après remise à zéro des flags d'envoi. */
async function schedule(qstash: Client, signupId: string, startsAt: Date): Promise<void> {
	// Reset des paliers : permet à un rappel de repartir après un déplacement de créneau
	// (un palier déjà marqué serait sinon droppé par l'endpoint).
	await db
		.update(signup)
		.set({ reminder24SentAt: null, reminder2SentAt: null })
		.where(eq(signup.id, signupId));

	const startsAtMs = startsAt.getTime();
	const url = callbackUrl();

	for (const palier of PALIERS) {
		const targetMs = startsAtMs - palier.minutes * 60 * 1000;
		if (targetMs <= Date.now()) continue; // échéance déjà passée (inscription tardive)
		await qstash.publishJSON({
			url,
			body: { signupId, kind: palier.kind, expectedStartsAtMs: startsAtMs },
			notBefore: Math.floor(targetMs / 1000),
			// Dédup : re-planifier à l'identique ne crée pas de doublon ; un déplacement change
			// `startsAtMs` donc génère un nouvel id (l'ancien message droppera à sa livraison).
			deduplicationId: `rem:${signupId}:${palier.kind}:${startsAtMs}`
		});
	}
}

/**
 * (Re)planifie les rappels d'une inscription précise. Relit `(shiftId, userId)` pour obtenir
 * `signupId` + `startsAt` (les services de mutation ne renvoient pas l'id). No-op si l'inscription
 * n'est pas `available`. À appeler après une création / promotion / déplacement de bénévole.
 */
export async function scheduleForSignup(shiftId: string, userId: string): Promise<void> {
	const qstash = getClient();
	if (!qstash) return;
	try {
		const rows = await db
			.select({ signupId: signup.id, status: signup.status, startsAt: shift.startsAt })
			.from(signup)
			.innerJoin(shift, eq(signup.shiftId, shift.id))
			.where(and(eq(signup.shiftId, shiftId), eq(signup.userId, userId)))
			.limit(1);
		const row = rows[0];
		if (!row || row.status !== 'available') return;
		await schedule(qstash, row.signupId, row.startsAt);
	} catch (err) {
		console.error('[reminder-scheduler] scheduleForSignup failed', err);
	}
}

/**
 * Reprogramme les rappels de **toutes** les inscriptions `available` d'un créneau — à appeler
 * après un déplacement de créneau (`shift.startsAt` modifié). Les anciens messages, portant
 * l'ancien timestamp, droppent d'eux-mêmes à leur livraison.
 */
export async function scheduleForShift(shiftId: string): Promise<void> {
	const qstash = getClient();
	if (!qstash) return;
	try {
		const rows = await db
			.select({ signupId: signup.id, startsAt: shift.startsAt })
			.from(signup)
			.innerJoin(shift, eq(signup.shiftId, shift.id))
			.where(and(eq(signup.shiftId, shiftId), eq(signup.status, 'available')));
		for (const row of rows) {
			await schedule(qstash, row.signupId, row.startsAt);
		}
	} catch (err) {
		console.error('[reminder-scheduler] scheduleForShift failed', err);
	}
}
