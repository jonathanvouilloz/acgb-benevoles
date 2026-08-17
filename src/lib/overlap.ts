/**
 * Détection de chevauchement entre créneaux (côté bénévole).
 *
 * Décision produit : on **avertit sans bloquer**. Un recouvrement peut être volontaire
 * (relève de 15 min, poste tenu à deux endroits proches) et l'organisateur doit pouvoir
 * le forcer depuis la matrice. Aucune règle serveur n'en découle : c'est de l'information.
 *
 * Toutes les dates sont des heures « murales » UTC-naïves (cf. src/lib/format.ts) ; la
 * comparaison de timestamps reste donc cohérente d'un créneau à l'autre.
 */
import type { SignupStatus } from '$lib/schemas/signup';

/** Un créneau déjà pris par le bénévole, tous tournois confondus. */
export type BusyShift = {
	shiftId: string;
	startsAt: Date;
	endsAt: Date;
	status: SignupStatus;
	positionName: string;
	/** Nom du tournoi si le créneau vient d'un **autre** tournoi, `null` si c'est le tournoi courant. */
	tournamentName: string | null;
};

type Span = { startsAt: Date; endsAt: Date };

/**
 * Deux créneaux se recouvrent-ils ? Bornes **strictes** : deux créneaux jointifs
 * (14:00–18:00 après 10:00–14:00) ne sont pas un chevauchement.
 */
export function overlaps(a: Span, b: Span): boolean {
	return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

/**
 * Créneaux déjà pris qui recouvrent `candidate`. Le créneau candidat lui-même est ignoré
 * (le bénévole peut déjà y être inscrit — ce n'est pas un conflit avec soi-même).
 */
export function findConflicts(
	candidate: { id: string; startsAt: Date; endsAt: Date },
	busy: BusyShift[]
): BusyShift[] {
	return busy.filter((b) => b.shiftId !== candidate.id && overlaps(candidate, b));
}
