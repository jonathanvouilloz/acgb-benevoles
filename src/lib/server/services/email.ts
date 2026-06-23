import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

/**
 * Expéditeur des emails transactionnels. À surcharger via `EMAIL_FROM` une fois un domaine
 * vérifié sur Resend ; `onboarding@resend.dev` permet de tester sans domaine.
 */
const FROM = env.EMAIL_FROM ?? 'Bénévoles ACGB <onboarding@resend.dev>';

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

function magicLinkHtml(url: string): string {
	return `
	<div style="font-family: 'Manrope', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0A1230;">
		<h1 style="font-size: 20px; color: #020E71; margin: 0 0 16px;">Bénévoles ACGB</h1>
		<p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
			Clique sur le bouton ci-dessous pour te connecter. Ce lien est valable 15 minutes.
		</p>
		<a href="${url}"
			style="display: inline-block; background: #020E71; color: #ffffff; text-decoration: none;
			       font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px;">
			Me connecter
		</a>
		<p style="font-size: 13px; line-height: 1.5; color: #5A6178; margin: 24px 0 0;">
			Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.
		</p>
	</div>`;
}
