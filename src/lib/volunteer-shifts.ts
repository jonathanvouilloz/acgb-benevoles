/**
 * Helpers côté bénévole : mise à plat chronologique des créneaux d'un tournoi
 * (tous postes confondus), séparation passé / à venir, et repérage du prochain
 * créneau de l'utilisateur. Le poste devient une étiquette portée par chaque créneau.
 */
import type { VolunteerShift, VolunteerTournament } from '$lib/server/services/signup-service';

export type FlatShift = VolunteerShift & {
	positionName: string;
	positionColor: string;
};

/** Tous les créneaux, triés par heure de début puis de fin (poste rattaché à chaque ligne). */
export function flattenShifts(t: VolunteerTournament): FlatShift[] {
	const out: FlatShift[] = [];
	for (const p of t.positions) {
		for (const s of p.shifts) {
			out.push({ ...s, positionName: p.name, positionColor: p.color });
		}
	}
	out.sort(
		(a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.endsAt.getTime() - b.endsAt.getTime()
	);
	return out;
}

/** Sépare les créneaux à venir (fin > now) des créneaux terminés (fin ≤ now). */
export function splitByTime(
	shifts: FlatShift[],
	now: number
): { upcoming: FlatShift[]; past: FlatShift[] } {
	const upcoming: FlatShift[] = [];
	const past: FlatShift[] = [];
	for (const s of shifts) {
		if (s.endsAt.getTime() <= now) past.push(s);
		else upcoming.push(s);
	}
	return { upcoming, past };
}

/** Le 1ᵉʳ créneau à venir où le bénévole est inscrit (« Ton prochain créneau »), ou null. */
export function nextOwnShift(upcoming: FlatShift[]): FlatShift | null {
	return upcoming.find((s) => s.myStatus !== null) ?? null;
}
