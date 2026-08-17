/**
 * Mise à plat d'un tournoi (postes → créneaux → inscrits) en lignes exploitables pour la
 * vue récap organisateur (tableau filtrable + export CSV). Tout est dérivé côté client à
 * partir des données déjà chargées par `getTournamentSignupsForOrganizer`.
 */
import { formatDay, formatTime } from '$lib/format';
import type { VolunteerTournament } from '$lib/server/services/signup-service';

export type RecapStatus = 'available' | 'maybe' | 'empty';

export type RecapRow = {
	userId: string;
	volunteerName: string;
	phone: string | null;
	note: string | null;
	positionId: string;
	positionName: string;
	positionColor: string;
	shiftId: string;
	day: Date;
	startsAt: Date;
	endsAt: Date;
	status: RecapStatus;
	/** Index de la place vide dans son créneau (0 pour une ligne d'inscription) — clé d'affichage. */
	slot: number;
};

/**
 * Une ligne par inscription, **plus une ligne `empty` par place encore libre** du créneau
 * (« à pourvoir »). Un créneau de 2 places avec 1 inscrit produit donc 2 lignes : l'inscrit
 * et le trou restant — sans quoi il sortait du filtre « À pourvoir » dès la première
 * inscription (bug remonté par l'organisatrice, cf. docs/features/13-*.md).
 *
 * Seules les inscriptions `available` consomment une place (règle de capacité du PRD) :
 * un `maybe` n'enlève pas de ligne « à pourvoir ».
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
			for (const su of s.signups) {
				rows.push({
					...base,
					userId: su.userId,
					volunteerName: su.name,
					phone: su.phone,
					note: su.note,
					status: su.status,
					slot: 0
				});
			}
			for (let i = 0; i < s.remaining; i++) {
				rows.push({
					...base,
					userId: '',
					volunteerName: '',
					phone: null,
					note: null,
					status: 'empty',
					slot: i
				});
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

/** Un inscrit prêt à l'affichage : nom + sa note libre éventuelle. */
export type PlanningPerson = { name: string; note: string | null };

/** Un créneau regroupé avec ses inscrits séparés par statut, prêt à l'affichage. */
export type PlanningShift = {
	id: string;
	startsAt: Date;
	endsAt: Date;
	capacity: number;
	availableCount: number;
	remaining: number;
	isFull: boolean;
	available: PlanningPerson[];
	maybe: PlanningPerson[];
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
				available: s.signups
					.filter((su) => su.status === 'available')
					.map((su) => ({ name: su.name, note: su.note })),
				maybe: s.signups
					.filter((su) => su.status === 'maybe')
					.map((su) => ({ name: su.name, note: su.note }))
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
