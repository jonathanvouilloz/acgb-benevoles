/**
 * Helpers de formatage FR. Toutes les dates du domaine (dates de tournoi, horaires de
 * créneaux) sont stockées comme heures « murales » en UTC-naïf — on lit donc en
 * `timeZone: 'UTC'` pour afficher exactement ce qui a été saisi, sans dérive de fuseau.
 */
const TZ = 'UTC';
const LOCALE = 'fr-CH';

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	timeZone: TZ
});

const longDayFmt = new Intl.DateTimeFormat(LOCALE, {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: TZ
});

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TZ
});

/** "lun. 23 juin" */
export function formatDay(d: Date): string {
	return dayFmt.format(d);
}

/** "07:00" */
export function formatTime(d: Date): string {
	return timeFmt.format(d);
}

/** "07:00 – 09:00" */
export function formatTimeRange(start: Date, end: Date): string {
	return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

/** "23 juin 2026" ou "23 – 25 juin 2026" si plage multi-jours. */
export function formatDateRange(start: Date, end: Date): string {
	if (start.getTime() === end.getTime()) return longDayFmt.format(start);
	return `${dayFmt.format(start)} – ${longDayFmt.format(end)}`;
}

/** Date → "YYYY-MM-DD" pour pré-remplir un <input type="date"> (UTC-naïf). */
export function toDateInputValue(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Date → "HH:mm" pour pré-remplir un <input type="time"> (UTC-naïf). */
export function toTimeInputValue(d: Date): string {
	return d.toISOString().slice(11, 16);
}
