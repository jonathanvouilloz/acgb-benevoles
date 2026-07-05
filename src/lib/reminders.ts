/**
 * Options du rappel court configurable par bénévole (Epic 6).
 *
 * Le rappel **24h** reste fixe ; seul le rappel court (« pars maintenant ») est réglable.
 * Source de vérité unique partagée par la validation Zod, le scheduler QStash, l'endpoint
 * récepteur et le sélecteur `/compte` — pour éviter toute dérive entre client et serveur.
 */

/** Délais proposés, en minutes avant le début du créneau. */
export const REMINDER_LEAD_OPTIONS = [15, 30, 60] as const;

export type ReminderLeadMin = (typeof REMINDER_LEAD_OPTIONS)[number];

/** Défaut appliqué aux comptes existants (= comportement historique). */
export const DEFAULT_REMINDER_LEAD_MIN: ReminderLeadMin = 30;

export function isReminderLead(value: unknown): value is ReminderLeadMin {
	return (REMINDER_LEAD_OPTIONS as readonly number[]).includes(value as number);
}

/** Libellé court d'un délai (« 15 min », « 1 h ») — pour l'UI et le corps de la notif. */
export function reminderLeadLabel(min: number): string {
	return min >= 60 ? `${min / 60} h` : `${min} min`;
}
