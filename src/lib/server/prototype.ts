import { env } from '$env/dynamic/private';

/**
 * Mode prototype (démo testable sans email). Activé via `PROTOTYPE_MODE=1` côté serveur.
 *
 * En mode prototype :
 * - le magic link n'est PAS envoyé par email : il est capturé en mémoire puis suivi
 *   immédiatement côté serveur (connexion instantanée, cf. routes/login/+page.server.ts) ;
 * - `/compte` expose une bascule de rôle organisateur/bénévole pour tout tester.
 *
 * À NE JAMAIS activer en prod réelle : court-circuite la vérification par email.
 */
export const isPrototype = env.PROTOTYPE_MODE === '1' || env.PROTOTYPE_MODE === 'true';

/**
 * Dernier magic link généré par email, en attente d'être suivi dans la même requête.
 * Volontairement éphémère (consommé immédiatement) — pas un store de session.
 */
const pendingLinks = new Map<string, string>();

export function stashPrototypeLink(email: string, url: string): void {
	pendingLinks.set(email.toLowerCase(), url);
}

/** Récupère ET retire le lien capturé pour cet email (usage unique). */
export function takePrototypeLink(email: string): string | undefined {
	const key = email.toLowerCase();
	const url = pendingLinks.get(key);
	pendingLinks.delete(key);
	return url;
}
