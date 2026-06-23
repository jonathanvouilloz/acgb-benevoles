import { createAuthClient } from 'better-auth/svelte';
import { magicLinkClient } from 'better-auth/client/plugins';

/**
 * Client Better Auth (navigateur). baseURL implicite = origine courante.
 * Utilisé pour la déconnexion ; la connexion passe par l'action serveur de /login.
 */
export const authClient = createAuthClient({
	plugins: [magicLinkClient()]
});
