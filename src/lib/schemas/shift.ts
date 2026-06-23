import { z } from 'zod';

/**
 * Validation d'un créneau. Le formulaire saisit un jour (`YYYY-MM-DD`) + deux heures
 * (`HH:mm`) + une capacité. Les timestamps complets `starts_at` / `ends_at` sont
 * recomposés par `toShiftTimestamps` au moment de l'insertion.
 */
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Jour invalide');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide');

export const shiftSchema = z
	.object({
		day: dateString,
		startTime: timeString,
		endTime: timeString,
		capacity: z.coerce
			.number({ message: 'Capacité invalide' })
			.int('Capacité invalide')
			.min(1, 'Au moins 1 place')
			.max(99, 'Capacité trop élevée')
	})
	.refine((d) => d.endTime > d.startTime, {
		message: "L'heure de fin doit être après le début",
		path: ['endTime']
	});

export type ShiftInput = z.infer<typeof shiftSchema>;

/**
 * Recompose les timestamps à partir du jour et des plages horaires.
 * On force l'UTC (suffixe `Z`) pour traiter ces heures comme des heures « murales »
 * stables : pas de dérive entre le dev (CET) et la prod Vercel (UTC). L'affichage
 * lit ces timestamps en `timeZone: 'UTC'` (cf. src/lib/format.ts).
 */
export function toShiftTimestamps(
	day: string,
	startTime: string,
	endTime: string
): { startsAt: Date; endsAt: Date } {
	return {
		startsAt: new Date(`${day}T${startTime}:00Z`),
		endsAt: new Date(`${day}T${endTime}:00Z`)
	};
}
