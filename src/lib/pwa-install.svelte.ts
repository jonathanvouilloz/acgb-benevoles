/**
 * Capture de l'événement `beforeinstallprompt` (Chrome/Android/Edge).
 *
 * Le navigateur émet cet événement une seule fois, tôt dans le cycle de vie de la page,
 * pour signaler que la PWA est installable. On l'intercepte, on empêche la mini-infobar
 * native, et on garde l'event pour déclencher l'installation au moment voulu (bouton du
 * gate). Le module s'auto-enregistre à l'import : `+layout.svelte` l'importe pour que le
 * listener soit posé avant que l'event ne parte.
 *
 * iOS/Safari n'émet jamais cet événement (installation manuelle uniquement) : `installPrompt`
 * y reste `null` et le gate bascule sur ses instructions « Sur l'écran d'accueil ».
 */
import { browser } from '$app/environment';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** État réactif partagé : event d'installation dispo (Android) et flag « installée ». */
export const pwaInstall = $state<{
	prompt: BeforeInstallPromptEvent | null;
	installed: boolean;
}>({
	prompt: null,
	installed: false
});

if (browser) {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		pwaInstall.prompt = e as BeforeInstallPromptEvent;
	});

	// L'utilisateur a installé l'app : on masque le gate et on libère l'event.
	window.addEventListener('appinstalled', () => {
		pwaInstall.prompt = null;
		pwaInstall.installed = true;
	});
}

/**
 * Déclenche l'invite d'installation native (Android). Renvoie `true` si l'utilisateur a
 * accepté. No-op renvoyant `false` si aucun event n'a été capturé (iOS, déjà installée…).
 */
export async function promptInstall(): Promise<boolean> {
	const evt = pwaInstall.prompt;
	if (!evt) return false;
	await evt.prompt();
	const { outcome } = await evt.userChoice;
	// L'event n'est utilisable qu'une fois : on le retire quel que soit le choix.
	pwaInstall.prompt = null;
	return outcome === 'accepted';
}
