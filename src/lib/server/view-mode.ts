import type { Cookies } from '@sveltejs/kit';
import { hasOrganizerAccess } from '$lib/roles';

/**
 * Mode de vue (préférence UI, pas un rôle). Un compte à accès organisateur peut basculer entre
 * sa vue organisateur et une vue bénévole (même compte, mêmes permissions). Stocké en cookie.
 * Un bénévole est toujours en vue bénévole.
 */
export type ViewMode = 'organizer' | 'volunteer';

export const VIEW_COOKIE = 'view';

export function getViewMode(cookies: Cookies, role: string | null | undefined): ViewMode {
	if (!hasOrganizerAccess(role)) return 'volunteer';
	return cookies.get(VIEW_COOKIE) === 'volunteer' ? 'volunteer' : 'organizer';
}
