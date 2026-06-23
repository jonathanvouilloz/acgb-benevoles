import type { LayoutServerLoad } from './$types';

/** Expose l'utilisateur courant au shell (état connecté / déconnexion). */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: locals.user };
};
