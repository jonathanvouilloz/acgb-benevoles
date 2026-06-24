import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Déconnexion côté serveur (POST depuis le bouton du shell).
 *
 * On passe par l'API interne Better Auth plutôt que par le client navigateur : sur une URL
 * de preview Vercel, l'origine du navigateur diffère de `BETTER_AUTH_URL`, donc un sign-out
 * côté client serait rejeté comme origine non fiable. Ici on récupère la réponse Better Auth
 * (qui porte les en-têtes d'effacement de cookie) et on la transforme en redirection 303.
 */
export const POST: RequestHandler = async ({ request }) => {
	const res = await auth.api.signOut({ headers: request.headers, asResponse: true });

	const headers = new Headers();
	for (const cookie of res.headers.getSetCookie()) headers.append('set-cookie', cookie);
	headers.set('location', '/login');

	return new Response(null, { status: 303, headers });
};
