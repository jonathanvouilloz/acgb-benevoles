/**
 * Mise à plat d'un tournoi (postes → créneaux → inscrits) en lignes exploitables pour la
 * vue récap organisateur (tableau filtrable + export CSV). Tout est dérivé côté client à
 * partir des données déjà chargées par `getTournamentSignupsForOrganizer`.
 */
import { formatDay, formatTime } from '$lib/format';
import type { VolunteerTournament } from '$lib/server/services/signup-service';

export type RecapStatus = 'available' | 'maybe' | 'empty';

export type RecapRow = {
	volunteerName: string;
	positionId: string;
	positionName: string;
	positionColor: string;
	shiftId: string;
	day: Date;
	startsAt: Date;
	endsAt: Date;
	status: RecapStatus;
};

/**
 * Une ligne par inscription. Un créneau sans inscrit produit une ligne `empty`
 * (« à pourvoir ») pour que l'organisateur voie les trous dans le tableau.
 */
export function flattenTournament(t: VolunteerTournament): RecapRow[] {
	const rows: RecapRow[] = [];
	for (const p of t.positions) {
		for (const s of p.shifts) {
			const base = {
				positionId: p.id,
				positionName: p.name,
				positionColor: p.color,
				shiftId: s.id,
				day: s.startsAt,
				startsAt: s.startsAt,
				endsAt: s.endsAt
			};
			if (s.signups.length === 0) {
				rows.push({ ...base, volunteerName: '', status: 'empty' });
			} else {
				for (const su of s.signups) {
					rows.push({ ...base, volunteerName: su.name, status: su.status });
				}
			}
		}
	}
	return rows;
}

export const STATUS_LABEL: Record<RecapStatus, string> = {
	available: 'Disponible',
	maybe: 'Peut-être',
	empty: 'À pourvoir'
};

/** Échappe une valeur pour un CSV à séparateur `;` (compatible Excel FR). */
function csvCell(value: string): string {
	if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
	return value;
}

/** Génère le contenu CSV (entêtes FR, séparateur `;`). */
export function toCsv(rows: RecapRow[]): string {
	const header = ['Bénévole', 'Poste', 'Jour', 'Début', 'Fin', 'Statut'];
	const lines = rows.map((r) =>
		[
			r.volunteerName || '—',
			r.positionName,
			formatDay(r.day),
			formatTime(r.startsAt),
			formatTime(r.endsAt),
			STATUS_LABEL[r.status]
		]
			.map(csvCell)
			.join(';')
	);
	return [header.join(';'), ...lines].join('\r\n');
}
