import { error, redirect } from '@sveltejs/kit';
import { hasOrganizerAccess } from '$lib/roles';

/**
 * Garde des routes réservées à l'organisateur (organizer ou super_admin).
 * - Non connecté → redirige vers /login.
 * - Connecté sans accès orga → 403.
 * Retourne l'utilisateur (typé non-null) pour usage direct dans le `load`/l'action.
 */
export function requireOrganizer(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (!hasOrganizerAccess(locals.user.role)) {
		throw error(403, 'Accès réservé aux organisateurs.');
	}
	return locals.user;
}

/**
 * Garde des routes réservées au super admin (`/admin`).
 * - Non connecté → redirige vers /login.
 * - Connecté mais pas super_admin → 403.
 */
export function requireSuperAdmin(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'super_admin') {
		throw error(403, 'Accès réservé aux administrateurs.');
	}
	return locals.user;
}

/**
 * Garde « simple connexion » (côté bénévole). Tout utilisateur connecté est accepté.
 * Non connecté → redirige vers /login en passant la cible à rejoindre après le magic link
 * (cf. flux `redirect` dans src/routes/login). Utilisé par les actions de /t/[token].
 */
export function requireLogin(
	locals: App.Locals,
	redirectTo: string
): NonNullable<App.Locals['user']> {
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
	}
	return locals.user;
}

/**
 * Valide une cible de redirection interne pour éviter les open-redirects.
 * N'accepte qu'un chemin relatif commençant par un seul `/` (pas `//`, pas de schéma).
 * Retourne le chemin si sûr, sinon `null`.
 */
export function safeRedirect(value: unknown): string | null {
	const s = typeof value === 'string' ? value : '';
	return /^\/(?!\/)[A-Za-z0-9/_\-?=%.&]*$/.test(s) ? s : null;
}
