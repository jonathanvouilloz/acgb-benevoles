/**
 * Helpers de détection PWA / plateforme — client-only.
 *
 * Source unique pour savoir si l'app tourne installée (standalone), sur quel type
 * d'appareil, et si on est piégé dans une webview in-app (WhatsApp, Instagram…) où
 * l'installation d'une PWA est impossible. Consommé par le gate d'installation
 * (`PwaInstallGate.svelte`) et l'opt-in push (`EnableNotifications.svelte`).
 *
 * Toutes ces fonctions touchent `window`/`navigator` : ne les appeler que côté client
 * (derrière `browser` de `$app/environment` ou dans `onMount`).
 */

/** PWA installée (ajoutée à l'écran d'accueil) → Web Push devient disponible sur iOS. */
export function isStandalone(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

/** iPhone/iPad (iPadOS récent se déclare « Macintosh » + écran tactile). */
export function isIOS(): boolean {
	return (
		/iPhone|iPad|iPod/.test(navigator.userAgent) ||
		(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
	);
}

export function isAndroid(): boolean {
	return /Android/.test(navigator.userAgent);
}

/** Mobile = iOS ou Android. Le desktop est exempté du gate d'installation. */
export function isMobile(): boolean {
	return isIOS() || isAndroid();
}

/**
 * Webview d'une app tierce (WhatsApp, Messenger, Instagram, Facebook, Line, Snapchat,
 * ou WebView Android générique). Ces navigateurs ne peuvent PAS installer de PWA :
 * il faut rediriger l'utilisateur vers Safari/Chrome. Renvoie le nom quand identifiable
 * pour personnaliser le message, sinon `null`.
 */
export function inAppBrowser(): string | null {
	const ua = navigator.userAgent;
	if (/FBAN|FBAV|FB_IAB|Messenger/.test(ua)) return 'Facebook';
	if (/Instagram/.test(ua)) return 'Instagram';
	if (/WhatsApp/.test(ua)) return 'WhatsApp';
	if (/Line\//.test(ua)) return 'Line';
	if (/Snapchat/.test(ua)) return 'Snapchat';
	if (/TikTok|BytedanceWebview/.test(ua)) return 'TikTok';
	// WebView Android générique (`; wv`) : ni Chrome ni Safari, install indisponible.
	if (/; wv\)/.test(ua)) return 'une application';
	return null;
}

/** Raccourci booléen : est-on dans un navigateur in-app quelconque ? */
export function isInAppBrowser(): boolean {
	return inAppBrowser() !== null;
}
