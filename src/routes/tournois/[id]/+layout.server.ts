import { requireOrganizer } from '$lib/server/auth-guard';
import type { LayoutServerLoad } from './$types';

/**
 * Garde d'accès de l'espace organisateur d'un tournoi (calquée sur `/admin`).
 *
 * Volontairement SANS requête : chaque page charge le tournoi avec la profondeur qui lui est
 * propre (`getTournamentForOrganizer` vs `getTournamentSignupsForOrganizer`) et porte déjà sa
 * propre garde de propriété. Un `load` de layout ferait une requête de plus pour rien.
 *
 * ⚠️ `requireOrganizer` dit seulement « c'est un organisateur » — la propriété du tournoi reste
 * vérifiée page par page.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	requireOrganizer(locals);
	return {};
};
