import { and, eq, gt, lte, isNull, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { signup, shift, position, tournament, pushSubscription } from '$lib/server/db/schema';
import { sendPush, type PushPayload } from './push-service';

/**
 * Envoi des rappels push (Epic 6). Deux paliers par inscription `available` :
 * - **24h** avant le créneau,
 * - **2h** avant le créneau.
 *
 * Idempotence : chaque palier est horodaté sur la ligne `signup` (`reminder_24_sent_at` /
 * `reminder_2_sent_at`). Une inscription due est marquée **après traitement**, même si le
 * bénévole n'a aucune souscription active — on n'essaie donc qu'une fois, quelle que soit
 * la fréquence du cron. La borne `startsAt > now` évite tout rappel sur un créneau passé.
 */

type Palier = { col: AnyPgColumn; hours: number; kind: '24h' | '2h' };

const PALIERS: Palier[] = [
	{ col: signup.reminder24SentAt, hours: 24, kind: '24h' },
	{ col: signup.reminder2SentAt, hours: 2, kind: '2h' }
];

type DueRow = {
	signupId: string;
	userId: string;
	startsAt: Date;
	positionName: string;
	tournamentName: string;
	shareToken: string;
};

/** Inscriptions `available` dont le créneau tombe dans la fenêtre [now, now + hours] et non encore notifiées pour ce palier. */
function findDue(palier: Palier, now: Date): Promise<DueRow[]> {
	const horizon = new Date(now.getTime() + palier.hours * 60 * 60 * 1000);
	return db
		.select({
			signupId: signup.id,
			userId: signup.userId,
			startsAt: shift.startsAt,
			positionName: position.name,
			tournamentName: tournament.name,
			shareToken: tournament.shareToken
		})
		.from(signup)
		.innerJoin(shift, eq(signup.shiftId, shift.id))
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(
			and(
				eq(signup.status, 'available'),
				isNull(palier.col),
				gt(shift.startsAt, now),
				lte(shift.startsAt, horizon)
			)
		);
}

const timeFmt = new Intl.DateTimeFormat('fr-CH', {
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Europe/Zurich'
});

function buildPayload(row: DueRow, kind: '24h' | '2h'): PushPayload {
	const when = timeFmt.format(row.startsAt); // ex. « samedi 14:00 »
	const body =
		kind === '24h'
			? `Rappel : ${row.positionName} — ${when}.`
			: `C'est bientôt : ${row.positionName} — ${when}.`;
	return { title: row.tournamentName, body, url: `/t/${row.shareToken}` };
}

/** Traite un palier : envoie les pushs dus puis marque les inscriptions. Retourne le nb de pushs délivrés. */
async function processPalier(palier: Palier, now: Date): Promise<number> {
	const due = await findDue(palier, now);
	if (due.length === 0) return 0;

	// Souscriptions de tous les bénévoles concernés, en une requête, groupées par user.
	const userIds = [...new Set(due.map((d) => d.userId))];
	const subs = await db
		.select()
		.from(pushSubscription)
		.where(inArray(pushSubscription.userId, userIds));
	const subsByUser = new Map<string, typeof subs>();
	for (const s of subs) {
		const list = subsByUser.get(s.userId) ?? [];
		list.push(s);
		subsByUser.set(s.userId, list);
	}

	// Envois en parallèle : chaque (inscription × souscription) est un POST HTTPS indépendant.
	// `sendPush` n'échoue jamais (best-effort, renvoie false), donc allSettled est défensif.
	const sends = due.flatMap((row) => {
		const payload = buildPayload(row, palier.kind);
		return (subsByUser.get(row.userId) ?? []).map((sub) => sendPush(sub, payload));
	});
	const delivered = (await Promise.all(sends)).filter(Boolean).length;

	// Marque toutes les inscriptions traitées (idempotence), souscription ou non.
	await db
		.update(signup)
		.set(palier.kind === '24h' ? { reminder24SentAt: now } : { reminder2SentAt: now })
		.where(
			inArray(
				signup.id,
				due.map((d) => d.signupId)
			)
		);

	return delivered;
}

/** Point d'entrée du cron : envoie tous les rappels dus à l'instant `now`. */
export async function sendDueReminders(
	now = new Date()
): Promise<{ sent24: number; sent2: number }> {
	const sent24 = await processPalier(PALIERS[0], now);
	const sent2 = await processPalier(PALIERS[1], now);
	return { sent24, sent2 };
}
