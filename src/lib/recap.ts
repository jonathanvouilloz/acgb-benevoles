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

/** Un créneau regroupé avec ses noms d'inscrits séparés par statut, prêt à l'affichage. */
export type PlanningShift = {
	id: string;
	startsAt: Date;
	endsAt: Date;
	capacity: number;
	availableCount: number;
	remaining: number;
	isFull: boolean;
	available: string[];
	maybe: string[];
};

export type PlanningPoste = {
	id: string;
	name: string;
	color: string;
	shifts: PlanningShift[];
};

/**
 * Regroupe le tournoi par poste → créneaux, avec les noms d'inscrits séparés
 * `available` / `maybe`. Source commune à la vue empilée mobile et au planning imprimé
 * « par poste ». Filtre optionnel par poste et par jour (YYYY-MM-DD, cf. `toDateInputValue`).
 */
export function planningByPoste(
	t: VolunteerTournament,
	filters: { positionId?: string; day?: string } = {}
): PlanningPoste[] {
	const { positionId, day } = filters;
	const out: PlanningPoste[] = [];
	for (const p of t.positions) {
		if (positionId && positionId !== 'all' && p.id !== positionId) continue;
		const shifts: PlanningShift[] = [];
		for (const s of p.shifts) {
			if (day && day !== 'all' && s.startsAt.toISOString().slice(0, 10) !== day) continue;
			shifts.push({
				id: s.id,
				startsAt: s.startsAt,
				endsAt: s.endsAt,
				capacity: s.capacity,
				availableCount: s.availableCount,
				remaining: s.remaining,
				isFull: s.isFull,
				available: s.signups.filter((su) => su.status === 'available').map((su) => su.name),
				maybe: s.signups.filter((su) => su.status === 'maybe').map((su) => su.name)
			});
		}
		if (shifts.length > 0) out.push({ id: p.id, name: p.name, color: p.color, shifts });
	}
	return out;
}

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
