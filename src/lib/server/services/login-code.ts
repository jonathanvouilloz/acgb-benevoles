/**
 * Code de connexion à 6 chiffres, en transit entre l'action /login et l'envoi du magic link.
 *
 * Le code est créé par le plugin `emailOTP` (`auth.api.createVerificationOTP`, qui le stocke
 * haché sans rien envoyer), puis glissé dans le MÊME email que le lien : `sendMagicLink` n'en
 * reçoit que l'URL, on lui passe donc le code par ce relais. Même requête, même instance :
 * une Map éphémère suffit (consommée aussitôt, comme `prototype.ts`).
 */
const pendingCodes = new Map<string, string>();

export function stashLoginCode(email: string, code: string): void {
	pendingCodes.set(email.toLowerCase(), code);
}

/** Récupère ET retire le code en transit pour cet email (usage unique). */
export function takeLoginCode(email: string): string | undefined {
	const key = email.toLowerCase();
	const code = pendingCodes.get(key);
	pendingCodes.delete(key);
	return code;
}
