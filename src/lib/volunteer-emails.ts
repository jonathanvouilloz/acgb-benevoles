import type { VolunteerTournament } from '$lib/server/services/signup-service';

/**
 * Adresses des bénévoles **disponibles** d'un tournoi, pour un envoi groupé depuis la messagerie
 * de l'organisateur (Cci). Les « peut-être » n'ont pas tenu de place : ils sont exclus.
 *
 * `missing` liste les disponibles sans vrai email (fiches gérées) : sans ce retour, l'organisateur
 * croirait écrire à tout le monde.
 */
export function collectAvailableEmails(t: VolunteerTournament): {
	emails: string[];
	missing: string[];
} {
	const seen = new Map<string, { name: string; email: string | null }>();
	for (const p of t.positions) {
		for (const s of p.shifts) {
			for (const su of s.signups) {
				if (su.status !== 'available' || seen.has(su.userId)) continue;
				seen.set(su.userId, { name: su.name, email: su.email });
			}
		}
	}
	const vols = [...seen.values()];
	return {
		emails: vols
			.flatMap((v) => (v.email ? [v.email] : []))
			.sort((a, b) => a.localeCompare(b, 'fr')),
		missing: vols
			.filter((v) => !v.email)
			.map((v) => v.name)
			.sort((a, b) => a.localeCompare(b, 'fr'))
	};
}
