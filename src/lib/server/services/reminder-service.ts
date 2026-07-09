import { and, eq, gt, lte, isNull, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { signup, shift, position, tournament, pushSubscription } from '$lib/server/db/schema';
import { sendPush, type PushPayload } from './push-service';
import { DEFAULT_REMINDER_LEAD_MIN, reminderLeadLabel } from '$lib/reminders';

/**
 * Envoi des rappels push (Epic 6). Deux paliers par inscription `available` :
 * - **24h** avant le créneau (fixe),
 * - **court** avant le créneau, délai réglable par bénévole (`user.reminder_lead_min`).
 *
 * Idempotence : chaque palier est horodaté sur la ligne `signup` (`reminder_24_sent_at` /
 * `reminder_2_sent_at` — cette dernière colonne porte désormais le palier court, nom conservé
 * pour éviter une migration). Une inscription due est marquée **après traitement**, même si le
 * bénévole n'a aucune souscription active — on n'essaie donc qu'une fois, quelle que soit
 * la fréquence du cron. La borne `startsAt > now` évite tout rappel sur un créneau passé.
 *
 * `kind` court renommé `'30min'` → `'short'` : le délai n'est plus figé, il est porté par le
 * message QStash (`leadMin`) et sert au libellé. Le sweep dormant (cron) reste au défaut 30min.
 */

export type ReminderKind = '24h' | 'short';

type Palier = { col: AnyPgColumn; minutes: number; kind: ReminderKind };

const PALIERS: Palier[] = [
	{ col: signup.reminder24SentAt, minutes: 24 * 60, kind: '24h' },
	{ col: signup.reminder2SentAt, minutes: DEFAULT_REMINDER_LEAD_MIN, kind: 'short' }
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
	const horizon = new Date(now.getTime() + palier.minutes * 60 * 1000);
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

// `timeZone: 'UTC'` : les horaires sont stockés en heure murale UTC-naïve (cf. src/lib/format.ts).
// Lire en 'UTC' réaffiche l'heure exacte saisie (« 21:00 »), cohérent avec tout le reste de l'app.
const timeFmt = new Intl.DateTimeFormat('fr-CH', {
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

function buildPayload(
	row: DueRow,
	kind: ReminderKind,
	leadMin: number = DEFAULT_REMINDER_LEAD_MIN
): PushPayload {
	const when = timeFmt.format(row.startsAt); // ex. « samedi 14:00 »
	const body =
		kind === '24h'
			? `Rappel : ${row.positionName} — ${when}.`
			: `Dans ${reminderLeadLabel(leadMin)} : ${row.positionName} — ${when}.`;
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

/**
 * Traite le rappel d'**une** inscription pour un palier donné — appelé par l'endpoint QStash
 * à l'échéance planifiée (modèle événementiel). Re-valide l'état au moment de la livraison
 * (QStash = at-least-once, et l'inscription a pu changer depuis la planification) puis **drop**
 * silencieusement si le rappel n'est plus pertinent :
 * - inscription supprimée / désinscrite / créneau supprimé (cascade) → introuvable ;
 * - repassée en `maybe` → `status !== 'available'` ;
 * - créneau déplacé → `startsAt` ne correspond plus à `expectedStartsAtMs` (les nouveaux
 *   messages, planifiés au déplacement, portent le bon timestamp) ;
 * - créneau déjà passé, ou palier déjà envoyé (colonne non nulle) → idempotence.
 * Sinon envoie le push et marque la colonne. Ne lève jamais (best-effort).
 */
export async function processSignupReminder(
	signupId: string,
	kind: ReminderKind,
	expectedStartsAtMs: number,
	leadMin: number = DEFAULT_REMINDER_LEAD_MIN,
	now = new Date()
): Promise<'sent' | 'dropped'> {
	const rows = await db
		.select({
			signupId: signup.id,
			userId: signup.userId,
			status: signup.status,
			startsAt: shift.startsAt,
			positionName: position.name,
			tournamentName: tournament.name,
			shareToken: tournament.shareToken,
			reminder24SentAt: signup.reminder24SentAt,
			reminder2SentAt: signup.reminder2SentAt
		})
		.from(signup)
		.innerJoin(shift, eq(signup.shiftId, shift.id))
		.innerJoin(position, eq(shift.positionId, position.id))
		.innerJoin(tournament, eq(position.tournamentId, tournament.id))
		.where(eq(signup.id, signupId))
		.limit(1);

	const row = rows[0];
	if (!row) return 'dropped';
	if (row.status !== 'available') return 'dropped';
	if (row.startsAt.getTime() !== expectedStartsAtMs) return 'dropped';
	if (row.startsAt.getTime() <= now.getTime()) return 'dropped';
	if (kind === '24h' ? row.reminder24SentAt : row.reminder2SentAt) return 'dropped';

	const payload = buildPayload(row, kind, leadMin);
	const subs = await db
		.select()
		.from(pushSubscription)
		.where(eq(pushSubscription.userId, row.userId));
	await Promise.all(subs.map((sub) => sendPush(sub, payload)));

	await db
		.update(signup)
		.set(kind === '24h' ? { reminder24SentAt: now } : { reminder2SentAt: now })
		.where(eq(signup.id, signupId));

	return 'sent';
}
