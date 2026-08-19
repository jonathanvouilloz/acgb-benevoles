import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { signup, shift, position, tournament, user } from '$lib/server/db/schema';
import { EMAIL_REJECTED, isManagedEmail, sendSignupDigestEmail, type DigestShift } from './email';
import { publicUrl } from './qstash';

/**
 * Envoi du récap email différé (Epic 15) — côté LIVRAISON.
 *
 * Pendant de `reminder-service.processSignupReminder`. Le message QStash ne porte qu'une
 * révision, jamais du contenu : tout ce qui part est relu en base au moment de l'envoi. Un point
 * de câblage oublié ne produit donc pas un email FAUX, seulement un email tardif.
 */

export type DigestOutcome =
	| 'sent'
	| 'sent-empty'
	| 'stale'
	| 'not-found'
	| 'no-email'
	| 'empty-first'
	| 'rejected'
	| 'send-failed';

/**
 * Réserve l'envoi de cette révision, en UNE instruction conditionnelle.
 *
 * C'est le point critique du mécanisme. Deux gardes dans le même `WHERE` :
 * - `revision = $rev` — **fraîcheur** : si un changement plus récent a déjà incrémenté la
 *   révision, c'est SON message qui partira ; celui-ci doit mourir. C'est le debounce.
 * - `sent_revision < $rev` — **idempotence** : QStash est at-least-once, le même message peut
 *   être livré deux fois.
 *
 * Un SELECT de contrôle suivi d'un UPDATE ne suffirait pas : deux livraisons concurrentes du
 * même message passeraient toutes les deux et enverraient deux emails. Le driver neon-http n'a
 * pas de transaction interactive, donc la seule fermeture possible est ce CAS — même
 * raisonnement que `insertSignupAtomic` pour la capacité d'un créneau.
 *
 * Renvoie l'ancienne valeur de `sent_revision` (nécessaire à la règle `empty-first` et à la
 * restauration), ou `null` si le claim a échoué.
 */
async function claimDigest(
	userId: string,
	tournamentId: string,
	revision: number,
	now: Date
): Promise<{ prevSent: number | null; byOrganizer: boolean } | null> {
	const res = await db.execute(sql`
		UPDATE signup_digest AS d
		   SET sent_revision = ${revision}, sent_at = ${now}
		  FROM (
			SELECT user_id, tournament_id, sent_revision AS prev_sent
			  FROM signup_digest
			 WHERE user_id = ${userId} AND tournament_id = ${tournamentId}::uuid
		  ) AS prev
		 WHERE d.user_id = prev.user_id
		   AND d.tournament_id = prev.tournament_id
		   AND d.revision = ${revision}
		   AND (d.sent_revision IS NULL OR d.sent_revision < ${revision})
		RETURNING prev.prev_sent AS prev_sent, d.by_organizer AS by_organizer
	`);
	const row = res.rows[0] as { prev_sent: number | null; by_organizer: boolean } | undefined;
	if (!row) return null;
	return { prevSent: row.prev_sent, byOrganizer: row.by_organizer };
}

/**
 * Rend le claim après un échec d'envoi RÉCUPÉRABLE, pour que QStash retente.
 * Conditionnel sur `sent_revision = $revision` : sans ce filtre on écraserait un envoi plus
 * récent qui aurait gagné entre-temps, et le bénévole recevrait un doublon différé.
 */
async function releaseDigest(
	userId: string,
	tournamentId: string,
	revision: number,
	prevSent: number | null
): Promise<void> {
	await db.execute(sql`
		UPDATE signup_digest
		   SET sent_revision = ${prevSent}, sent_at = NULL
		 WHERE user_id = ${userId} AND tournament_id = ${tournamentId}::uuid
		   AND sent_revision = ${revision}
	`);
}

/** Tous les créneaux du bénévole sur ce tournoi, dans l'ordre chronologique. */
async function loadShifts(userId: string, tournamentId: string): Promise<DigestShift[]> {
	return db
		.select({
			positionName: position.name,
			positionColor: position.color,
			startsAt: shift.startsAt,
			endsAt: shift.endsAt,
			status: signup.status,
			note: signup.note
		})
		.from(signup)
		.innerJoin(shift, eq(signup.shiftId, shift.id))
		.innerJoin(position, eq(shift.positionId, position.id))
		.where(and(eq(signup.userId, userId), eq(position.tournamentId, tournamentId)))
		.orderBy(asc(shift.startsAt));
}

/**
 * Traite un message de récap arrivé à échéance. Rend toujours un verdict ; l'endpoint ne
 * renvoie une erreur HTTP que sur `send-failed`, seul cas où un retry a une chance d'aboutir.
 */
export async function processDigest(
	userId: string,
	tournamentId: string,
	revision: number,
	now: Date = new Date()
): Promise<DigestOutcome> {
	const volunteerRows = await db
		.select({ email: user.email, name: user.name })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	const volunteer = volunteerRows[0];
	if (!volunteer) return 'not-found';

	// Re-contrôle : `attachEmail` / `updateManagedVolunteer` ont pu changer l'adresse depuis la
	// planification, dans un sens comme dans l'autre.
	if (isManagedEmail(volunteer.email)) return 'no-email';

	const tournamentRows = await db
		.select({
			name: tournament.name,
			location: tournament.location,
			instructions: tournament.instructions,
			shareToken: tournament.shareToken,
			organizerName: user.name,
			organizerEmail: user.email,
			organizerPhone: user.phone
		})
		.from(tournament)
		.innerJoin(user, eq(tournament.organizerId, user.id))
		.where(eq(tournament.id, tournamentId))
		.limit(1);
	const t = tournamentRows[0];
	if (!t) return 'not-found';

	const claim = await claimDigest(userId, tournamentId, revision, now);
	// Échec du claim : soit une révision plus récente existe (son message partira), soit ce
	// message a déjà été traité. Les deux sont corrects et indiscernables sans importance.
	if (!claim) return 'stale';

	const shifts = await loadShifts(userId, tournamentId);

	// Un PREMIER récap vide ne s'envoie pas : c'est le cas « l'organisateur inscrit puis retire
	// dans la même fenêtre ». Annoncer « tu n'es plus inscrit·e » à quelqu'un qui n'a jamais rien
	// reçu serait un email fantôme. On garde le claim pour ne pas rejouer le message.
	if (shifts.length === 0 && claim.prevSent === null) return 'empty-first';

	try {
		await sendSignupDigestEmail({
			to: volunteer.email,
			volunteerName: volunteer.name,
			tournamentName: t.name,
			tournamentLocation: t.location,
			tournamentInstructions: t.instructions,
			tournamentUrl: publicUrl(`/t/${t.shareToken}`),
			organizer: { name: t.organizerName, email: t.organizerEmail, phone: t.organizerPhone },
			shifts,
			byOrganizer: claim.byOrganizer
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : '';
		// Refus définitif de Resend : retenter bouclerait. On GARDE le claim.
		if (message.startsWith(EMAIL_REJECTED)) {
			console.error('[digest-service] envoi refusé par Resend', err);
			return 'rejected';
		}
		// Panne réseau ou configuration manquante : on rend le claim, QStash retentera.
		await releaseDigest(userId, tournamentId, revision, claim.prevSent);
		console.error('[digest-service] envoi échoué, claim rendu', err);
		return 'send-failed';
	}

	return shifts.length === 0 ? 'sent-empty' : 'sent';
}
