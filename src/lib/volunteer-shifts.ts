/**
 * Helpers côté bénévole : mise à plat des créneaux d'un tournoi (tous postes confondus),
 * séparation passé / à venir, filtrage (jour / tranche horaire / poste / dispo / mes
 * inscriptions) et regroupement pour l'affichage (par temps ou par poste).
 *
 * Le poste devient une étiquette portée par chaque créneau. Toutes les dates sont des heures
 * « murales » en UTC-naïf (cf. format.ts) : on lit donc les heures en UTC pour rester cohérent.
 */
import { formatDay, toDateInputValue } from '$lib/format';
import type { VolunteerShift, VolunteerTournament } from '$lib/server/services/signup-service';

export type FlatShift = VolunteerShift & {
	positionId: string;
	positionName: string;
	positionColor: string;
};

/** Tous les créneaux, triés par heure de début puis de fin (poste rattaché à chaque ligne). */
export function flattenShifts(t: VolunteerTournament): FlatShift[] {
	const out: FlatShift[] = [];
	for (const p of t.positions) {
		for (const s of p.shifts) {
			out.push({ ...s, positionId: p.id, positionName: p.name, positionColor: p.color });
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

/* ------------------------------------------------------------------ *
 * Tranches horaires — presets simples (couvrent l'écrasante majorité
 * des cas « je suis dispo le matin / l'après-midi / le soir »).
 * ------------------------------------------------------------------ */

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export const SLOT_LABELS: Record<TimeSlot, string> = {
	morning: 'Matin',
	afternoon: 'Après-midi',
	evening: 'Soir'
};

/** Ordre d'affichage des tranches (chronologique). */
export const SLOT_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening'];

/** Tranche d'un créneau d'après son heure de début : matin < 12 h ≤ après-midi < 18 h ≤ soir. */
export function timeSlotOf(d: Date): TimeSlot {
	const h = d.getUTCHours();
	if (h < 12) return 'morning';
	if (h < 18) return 'afternoon';
	return 'evening';
}

/** Clé de jour "YYYY-MM-DD" (UTC-naïf), pour grouper/filtrer par journée. */
export function dayKeyOf(d: Date): string {
	return toDateInputValue(d);
}

/* ------------------------------------------------------------------ *
 * Plage horaire continue — le bénévole pose une fenêtre « de X h à Y h »
 * (curseur à deux poignées) et voit tout ce qui la chevauche.
 * Tout est exprimé en minutes depuis minuit (heure murale, UTC-naïf).
 * ------------------------------------------------------------------ */

/** Fenêtre horaire sélectionnée, en minutes depuis minuit. */
export type TimeWindow = { start: number; end: number };

/** Minutes depuis minuit de l'heure de début (heure murale UTC-naïf). */
export function minutesOfDay(d: Date): number {
	return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Minute de fin d'un créneau dans sa journée de début. Un créneau qui se termine
 * le lendemain (ou pile à minuit) est ramené à 24 h pour rester comparable.
 */
function endMinutesOf(s: FlatShift): number {
	if (dayKeyOf(s.endsAt) !== dayKeyOf(s.startsAt)) return 24 * 60;
	const m = minutesOfDay(s.endsAt);
	return m === 0 ? 24 * 60 : m;
}

/**
 * Bornes horaires (en heures pleines) couvrant tous les créneaux : début arrondi
 * vers le bas, fin vers le haut. Définit l'amplitude du curseur. Repli 8 h–22 h si vide.
 */
export function shiftHourBounds(shifts: FlatShift[]): { min: number; max: number } {
	if (shifts.length === 0) return { min: 8, max: 22 };
	let min = 24;
	let max = 0;
	for (const s of shifts) {
		const sh = Math.floor(minutesOfDay(s.startsAt) / 60);
		const eh = Math.ceil(endMinutesOf(s) / 60);
		if (sh < min) min = sh;
		if (eh > max) max = eh;
	}
	if (max <= min) max = min + 1;
	return { min, max };
}

/** Le créneau chevauche-t-il la fenêtre [start, end) (en minutes) ? */
export function overlapsWindow(s: FlatShift, w: TimeWindow): boolean {
	return minutesOfDay(s.startsAt) < w.end && endMinutesOf(s) > w.start;
}

/**
 * Densité des besoins par heure sur [hourMin, hourMax) : pour chaque heure, somme des
 * places encore à pourvoir des créneaux qui la chevauchent. Sert à dessiner l'histogramme
 * derrière le curseur (« où ça manque »).
 */
export function needDensity(shifts: FlatShift[], hourMin: number, hourMax: number): number[] {
	const arr = new Array(Math.max(0, hourMax - hourMin)).fill(0);
	for (const s of shifts) {
		const startM = minutesOfDay(s.startsAt);
		const endM = endMinutesOf(s);
		for (let h = hourMin; h < hourMax; h++) {
			if (startM < (h + 1) * 60 && endM > h * 60) arr[h - hourMin] += s.remaining;
		}
	}
	return arr;
}

/* ------------------------------------------------------------------ *
 * Filtrage
 * ------------------------------------------------------------------ */

export type ShiftFilters = {
	/** Jour "YYYY-MM-DD", ou null = tous les jours. */
	day: string | null;
	/** Plage horaire (minutes depuis minuit), ou null = toute la journée. */
	window: TimeWindow | null;
	/** Ids de postes retenus ; liste vide = tous les postes. */
	positionIds: string[];
	/** Ne garder que les créneaux avec au moins une place libre. */
	onlyAvailable: boolean;
	/** Ne garder que les créneaux où le bénévole est inscrit. */
	onlyMine: boolean;
};

export function filterShifts(shifts: FlatShift[], f: ShiftFilters): FlatShift[] {
	return shifts.filter((s) => {
		if (f.day && dayKeyOf(s.startsAt) !== f.day) return false;
		if (f.window && !overlapsWindow(s, f.window)) return false;
		if (f.positionIds.length > 0 && !f.positionIds.includes(s.positionId)) return false;
		if (f.onlyAvailable && s.isFull) return false;
		if (f.onlyMine && s.myStatus === null) return false;
		return true;
	});
}

/* ------------------------------------------------------------------ *
 * Options des filtres — calculées d'après les créneaux réellement
 * présents (on n'affiche pas un jour / une tranche / un poste vide).
 * ------------------------------------------------------------------ */

export type Option = { value: string; label: string };

/** Jours distincts présents dans la liste (chronologique). */
export function distinctDays(shifts: FlatShift[]): Option[] {
	const seen = new Map<string, string>();
	for (const s of shifts) {
		const key = dayKeyOf(s.startsAt);
		if (!seen.has(key)) seen.set(key, formatDay(s.startsAt));
	}
	return [...seen].map(([value, label]) => ({ value, label }));
}

/** Ids de postes présents dans la liste (pour filtrer les chips de poste). */
export function presentPositionIds(shifts: FlatShift[]): Set<string> {
	return new Set(shifts.map((s) => s.positionId));
}

/** Somme des places encore à pourvoir sur une liste de créneaux. */
export function totalRemaining(shifts: FlatShift[]): number {
	return shifts.reduce((sum, s) => sum + s.remaining, 0);
}

/* ------------------------------------------------------------------ *
 * Regroupement pour l'affichage
 * ------------------------------------------------------------------ */

/** Un groupe « par temps » : une journée × une tranche. */
export type TimeGroup = {
	key: string;
	dayLabel: string;
	slotLabel: string;
	shifts: FlatShift[];
};

/**
 * Regroupe par (jour, tranche) en conservant l'ordre chronologique.
 * Suppose `shifts` déjà trié par heure de début (cf. flattenShifts).
 */
export function groupByTime(shifts: FlatShift[]): TimeGroup[] {
	const groups: TimeGroup[] = [];
	const index = new Map<string, TimeGroup>();
	for (const s of shifts) {
		const slot = timeSlotOf(s.startsAt);
		const key = `${dayKeyOf(s.startsAt)}|${slot}`;
		let g = index.get(key);
		if (!g) {
			g = { key, dayLabel: formatDay(s.startsAt), slotLabel: SLOT_LABELS[slot], shifts: [] };
			index.set(key, g);
			groups.push(g);
		}
		g.shifts.push(s);
	}
	return groups;
}

/** Un groupe « par poste » : un poste et ses créneaux (filtrés). */
export type PositionGroup = {
	id: string;
	name: string;
	color: string;
	remaining: number;
	shifts: FlatShift[];
};

/**
 * Regroupe par poste, dans l'ordre des postes du tournoi. N'inclut que les postes ayant
 * au moins un créneau après filtrage.
 */
export function groupByPosition(
	shifts: FlatShift[],
	positions: { id: string; name: string; color: string }[]
): PositionGroup[] {
	const byPos = new Map<string, FlatShift[]>();
	for (const s of shifts) {
		const arr = byPos.get(s.positionId);
		if (arr) arr.push(s);
		else byPos.set(s.positionId, [s]);
	}
	const out: PositionGroup[] = [];
	for (const p of positions) {
		const ps = byPos.get(p.id);
		if (!ps || ps.length === 0) continue;
		out.push({ id: p.id, name: p.name, color: p.color, remaining: totalRemaining(ps), shifts: ps });
	}
	return out;
}
