/**
 * Conversion « heure murale » → instant réel pour la planification des rappels.
 *
 * Les horaires de créneaux sont stockés en **heure murale UTC-naïve** (ex. « 21:00 » saisi →
 * `Date("…T21:00:00Z")`) et affichés en `timeZone: 'UTC'` (cf. `src/lib/format.ts`) : cohérent
 * pour l'affichage, mais un instant absolu (QStash `notBefore`) exige de convertir cette heure
 * murale — interprétée dans le fuseau des tournois (Europe/Zurich) — en instant réel epoch.
 * Ex. été (CEST=UTC+2) : « 21:00 mural » → `19:00 UTC` réel.
 */

const ZURICH = 'Europe/Zurich';

/** Offset (ms) du fuseau `tz` à l'instant `date`. Positif à l'est de UTC (Zurich : +1h/+2h). */
function tzOffsetMs(date: Date, tz: string): number {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
	const h = p.hour === '24' ? '0' : p.hour; // Node peut rendre « 24 » à minuit
	const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +h, +p.minute, +p.second);
	return asUTC - date.getTime();
}

/** Heure murale (portée par les champs UTC de `wall`) interprétée en Europe/Zurich → instant réel (epoch ms). */
export function zurichWallClockToInstant(wall: Date): number {
	const wallMs = wall.getTime();
	let offset = tzOffsetMs(wall, ZURICH);
	offset = tzOffsetMs(new Date(wallMs - offset), ZURICH); // 2e passe : bascules DST
	return wallMs - offset;
}
