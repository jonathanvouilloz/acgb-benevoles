import { redirect } from '@sveltejs/kit';
import { hasOrganizerAccess } from '$lib/roles';
import { safeRedirect } from '$lib/server/auth-guard';
import { VIEW_COOKIE, type ViewMode } from '$lib/server/view-mode';
import type { RequestHandler } from './$types';

/**
 * Bascule le mode de vue (organizer ↔ volunteer) via un cookie, puis revient sur la page courante.
 * Réservé aux comptes à accès organisateur ; sinon on ignore et on redirige simplement.
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const form = await request.formData();
	const to: ViewMode = form.get('mode') === 'volunteer' ? 'volunteer' : 'organizer';
	const back = safeRedirect(form.get('redirect')) ?? '/';

	if (locals.user && hasOrganizerAccess(locals.user.role)) {
		cookies.set(VIEW_COOKIE, to, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	throw redirect(303, back);
};
