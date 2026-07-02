import { isPrototype } from '$lib/server/prototype';
import { getViewMode } from '$lib/server/view-mode';
import type { LayoutServerLoad } from './$types';

/** Expose l'utilisateur courant au shell (état connecté / déconnexion) + flag prototype + mode de vue. */
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return {
		user: locals.user,
		prototype: isPrototype,
		viewMode: getViewMode(cookies, locals.user?.role)
	};
};
