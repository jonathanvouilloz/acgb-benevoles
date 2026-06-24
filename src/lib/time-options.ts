/**
 * Génération des options de saisie d'un créneau : heures par pas de 15 min et jours de la
 * plage du tournoi. Tout est en UTC-naïf, cohérent avec `format.ts` (heures « murales »).
 */
import { formatDay, toDateInputValue } from '$lib/format';

export type Option = { value: string; label: string };

/** Convertit "HH:mm" en minutes depuis minuit. */
function toMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/**
 * Liste des heures par pas de `step` minutes, bornées à [min, max] inclus
 * (label = value, format HH:mm). Par défaut 07:00 → 21:00 : on n'expose pas
 * d'horaires inutiles pour des créneaux bénévoles.
 */
export function timeOptions(step = 15, min = '07:00', max = '21:00'): Option[] {
	const out: Option[] = [];
	const end = toMinutes(max);
	for (let m = toMinutes(min); m <= end; m += step) {
		const hh = String(Math.floor(m / 60)).padStart(2, '0');
		const mm = String(m % 60).padStart(2, '0');
		const v = `${hh}:${mm}`;
		out.push({ value: v, label: v });
	}
	return out;
}

/** "09:00" + 60 → "10:00", borné à "23:45" (pour l'auto-remplissage de la fin à +1 h). */
export function addMinutesClamped(hhmm: string, minutes: number, max = '23:45'): string {
	const [h, m] = hhmm.split(':').map(Number);
	if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
	const total = Math.min(h * 60 + m + minutes, 23 * 60 + 45);
	const [maxH, maxM] = max.split(':').map(Number);
	const clamped = Math.min(total, maxH * 60 + maxM);
	const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
	const mm = String(clamped % 60).padStart(2, '0');
	return `${hh}:${mm}`;
}

/** Un item par jour de la plage [start, end] du tournoi (value = YYYY-MM-DD, label = "lun. 23 juin"). */
export function dayOptions(start: Date, end: Date): Option[] {
	const out: Option[] = [];
	// Itère en UTC, jour par jour, bornes incluses.
	const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
	const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
	while (cur.getTime() <= last) {
		out.push({ value: toDateInputValue(cur), label: formatDay(cur) });
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
	return out;
}
