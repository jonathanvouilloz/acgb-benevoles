import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { formatDay, formatTimeRange } from '$lib/format';

/**
 * Expéditeur des emails transactionnels. À surcharger via `EMAIL_FROM` une fois un domaine
 * vérifié sur Resend ; `onboarding@resend.dev` permet de tester sans domaine.
 */
const FROM = env.EMAIL_FROM ?? 'Bénévoles ACGB <onboarding@resend.dev>';

/**
 * Domaine des emails générés pour les bénévoles créés par un organisateur (Epic 14).
 * Non routable : toute tentative d'envoi bouncerait et abîmerait la réputation du domaine
 * expéditeur. Aucun email ne doit JAMAIS partir vers ce domaine (cf. `isManagedEmail`).
 */
export const MANAGED_EMAIL_DOMAIN = '@benevoles.acgb.local';

/**
 * Préfixe des erreurs d'envoi **définitives** (Resend a répondu et refusé). Les distingue d'une
 * panne réseau ou d'une clé manquante, qui elles justifient un retry. Cf. `digest-service`.
 */
export const EMAIL_REJECTED = 'EMAIL_REJECTED';

/** L'adresse est-elle un email généré (bénévole hors app) plutôt qu'une vraie boîte ? */
export function isManagedEmail(email: string): boolean {
	return email.trim().toLowerCase().endsWith(MANAGED_EMAIL_DOMAIN);
}

/** Client Resend instancié à la demande (évite l'erreur « Missing API key » au build). */
function client(): Resend {
	if (!env.RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY manquant : impossible d’envoyer l’email.');
	}
	return new Resend(env.RESEND_API_KEY);
}

/**
 * Envoie le magic link de connexion. La logique d'auth vit dans Better Auth ; ce service
 * ne fait que la mise en forme et l'envoi (cf. conventions docs/STYLEGUIDE.md).
 */
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
	// Garde dure : une fiche bénévole n'a pas de boîte réelle. On abandonne silencieusement
	// (pas d'exception) — un envoi impossible ne doit jamais faire échouer le flux appelant.
	if (isManagedEmail(email)) {
		console.warn('[email] envoi ignoré : adresse générée (bénévole hors app)');
		return;
	}

	const { error } = await client().emails.send({
		from: FROM,
		to: email,
		subject: 'Ton lien de connexion — Bénévoles ACGB',
		html: magicLinkHtml(url)
	});

	if (error) {
		throw new Error(`Échec de l'envoi du magic link : ${error.message}`);
	}
}

/* ------------------------------------------------------------------ *
 * Gabarit commun. Les clients mail ignorent les feuilles de style et la
 * plupart du CSS moderne : tout est en styles inline, en tableaux de
 * couleurs simples, sans classe ni variable. Palette = celle de l'app
 * (cf. docs/DESIGN.md) recopiée en dur, faute de tokens côté email.
 * ------------------------------------------------------------------ */

const INK = '#0A1230';
const INK_MUTED = '#5A6178';
const BRAND = '#020E71';

/** Échappe le texte utilisateur (nom de tournoi, consigne, note) avant injection dans le HTML. */
export function esc(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Enveloppe commune à tous les emails : en-tête de marque, corps, bouton d'action optionnel. */
export function emailLayout(
	bodyHtml: string,
	cta?: { url: string; label: string },
	footerHtml?: string
): string {
	const button = cta
		? `<a href="${cta.url}"
			style="display: inline-block; background: ${BRAND}; color: #ffffff; text-decoration: none;
			       font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px;">
			${esc(cta.label)}
		</a>`
		: '';
	const footer = footerHtml
		? `<p style="font-size: 13px; line-height: 1.5; color: ${INK_MUTED}; margin: 24px 0 0;">${footerHtml}</p>`
		: '';
	return `
	<div style="font-family: 'Manrope', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: ${INK};">
		<h1 style="font-size: 20px; color: ${BRAND}; margin: 0 0 16px;">Bénévoles ACGB</h1>
		${bodyHtml}
		${button}
		${footer}
	</div>`;
}

function magicLinkHtml(url: string): string {
	return emailLayout(
		`<p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
			Clique sur le bouton ci-dessous pour te connecter. Ce lien est valable 15 minutes.
		</p>`,
		{ url, label: 'Me connecter' },
		"Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email."
	);
}

/* ------------------------------------------------------------------ *
 * Récap des créneaux (Epic 15) — envoyé en différé par digest-service.
 * ------------------------------------------------------------------ */

/** Un créneau tel qu'il apparaît dans le récap. */
export type DigestShift = {
	positionName: string;
	positionColor: string;
	startsAt: Date;
	endsAt: Date;
	status: 'available' | 'maybe';
	note: string | null;
};

export type SignupDigestEmail = {
	to: string;
	volunteerName: string;
	tournamentName: string;
	tournamentLocation: string | null;
	tournamentInstructions: string | null;
	tournamentUrl: string;
	organizer: { name: string; email: string; phone: string | null };
	/** Vide → variante « désinscription ». On n'envoie jamais un corps vide. */
	shifts: DigestShift[];
	/** Le dernier changement vient-il de l'organisateur ? Change l'intro. */
	byOrganizer: boolean;
};

/**
 * Récap de tout ce sur quoi le bénévole est engagé pour UN tournoi.
 *
 * Un seul email quel que soit le nombre de changements (cf. digest-service pour le debounce).
 * Les `maybe` sont listées et marquées : les taire donnerait un récap faux.
 */
export async function sendSignupDigestEmail(input: SignupDigestEmail): Promise<void> {
	if (isManagedEmail(input.to)) {
		console.warn('[email] récap ignoré : adresse générée (bénévole hors app)');
		return;
	}

	const empty = input.shifts.length === 0;
	const subject = empty
		? `Inscription annulée — ${input.tournamentName}`
		: `Tes créneaux — ${input.tournamentName}`;

	const { error } = await client().emails.send({
		from: FROM,
		to: input.to,
		subject,
		html: digestHtml(input)
	});

	// Erreur STRUCTUREE de Resend (adresse refusée, quota…) : retenter ne servirait à rien.
	// Le préfixe permet à l'appelant de la distinguer d'une panne réseau, qui elle mérite un retry.
	if (error) {
		throw new Error(`${EMAIL_REJECTED}: ${error.message}`);
	}
}

function digestHtml(input: SignupDigestEmail): string {
	const firstName = input.volunteerName.trim().split(/\s+/)[0];
	const intro =
		input.shifts.length === 0
			? input.byOrganizer
				? "L'organisateur t'a retiré de tous les créneaux de ce tournoi."
				: 'Tu n’es plus inscrit·e sur aucun créneau de ce tournoi.'
			: input.byOrganizer
				? "L'organisateur a modifié ton planning. Voici où tu es inscrit·e :"
				: 'Voici ce que tu as choisi :';

	const rows = input.shifts
		.map((s) => {
			const when = `${formatDay(s.startsAt)}, ${formatTimeRange(s.startsAt, s.endsAt)}`;
			const flag =
				s.status === 'maybe' ? ` <span style="color: ${INK_MUTED};">· peut-être</span>` : '';
			const note = s.note
				? `<div style="font-size: 13px; color: ${INK_MUTED}; margin-top: 2px;">${esc(s.note)}</div>`
				: '';
			return `<li style="margin: 0 0 10px; list-style: none;">
				<span style="display: inline-block; width: 8px; height: 8px; border-radius: 4px; background: ${s.positionColor};"></span>
				<strong>${esc(s.positionName)}</strong>${flag}
				<div style="font-size: 14px; margin-top: 1px;">${esc(when)}</div>
				${note}
			</li>`;
		})
		.join('');

	const list = rows
		? `<ul style="margin: 0 0 24px; padding: 0;">${rows}</ul>`
		: '<p style="margin: 0 0 24px;"></p>';

	const where = input.tournamentLocation
		? `<p style="font-size: 14px; color: ${INK_MUTED}; margin: 0 0 16px;">${esc(input.tournamentLocation)}</p>`
		: '';

	const instructions = input.tournamentInstructions
		? `<div style="border-left: 3px solid ${BRAND}; padding: 4px 0 4px 12px; margin: 0 0 24px; font-size: 14px; white-space: pre-line;">${esc(input.tournamentInstructions)}</div>`
		: '';

	const contact = [
		`Une question ? Écris à ${esc(input.organizer.name)} — ${esc(input.organizer.email)}`,
		input.organizer.phone ? ` ou ${esc(input.organizer.phone)}` : ''
	].join('');

	return emailLayout(
		`<p style="font-size: 15px; line-height: 1.5; margin: 0 0 4px;">Bonjour ${esc(firstName)},</p>
		<p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">${intro}</p>
		<h2 style="font-size: 16px; margin: 0 0 4px;">${esc(input.tournamentName)}</h2>
		${where}
		${list}
		${instructions}`,
		{ url: input.tournamentUrl, label: 'Voir / modifier mes créneaux' },
		contact
	);
}

/* ------------------------------------------------------------------ *
 * Rappel de la veille (Epic 15) — complète le push, qui n'arrive que si
 * le bénévole a activé les notifications sur son appareil.
 * ------------------------------------------------------------------ */

export type ShiftReminderEmail = {
	to: string;
	volunteerName: string;
	tournamentName: string;
	positionName: string;
	startsAt: Date;
	endsAt: Date;
	tournamentUrl: string;
};

/** Rappel 24 h avant le créneau. Le palier court reste push seul (un email arriverait trop tard). */
export async function sendShiftReminderEmail(input: ShiftReminderEmail): Promise<void> {
	if (isManagedEmail(input.to)) return;

	const firstName = input.volunteerName.trim().split(/\s+/)[0];
	const when = `${formatDay(input.startsAt)}, ${formatTimeRange(input.startsAt, input.endsAt)}`;

	const { error } = await client().emails.send({
		from: FROM,
		to: input.to,
		subject: `Demain : ${input.positionName} — ${input.tournamentName}`,
		html: emailLayout(
			`<p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Bonjour ${esc(firstName)},</p>
			<p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
				Petit rappel : tu es attendu·e demain sur
				<strong>${esc(input.positionName)}</strong> — ${esc(when)}.
			</p>
			<p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">${esc(input.tournamentName)}</p>`,
			{ url: input.tournamentUrl, label: 'Voir mes créneaux' },
			"Un empêchement ? Prends une minute pour te désinscrire, l'organisateur pourra te remplacer."
		)
	});

	if (error) {
		throw new Error(`${EMAIL_REJECTED}: ${error.message}`);
	}
}
