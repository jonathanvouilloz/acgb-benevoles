import { error, redirect } from '@sveltejs/kit';

/**
 * Garde des routes réservées à l'organisateur.
 * - Non connecté → redirige vers /login.
 * - Connecté mais non-organisateur → 403.
 * Retourne l'utilisateur (typé non-null) pour usage direct dans le `load`/l'action.
 */
export function requireOrganizer(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (!locals.user.isOrganizer) {
		throw error(403, 'Accès réservé aux organisateurs.');
	}
	return locals.user;
}
