/**
 * Phase d'un tournoi dérivée de ses dates (pur, client-safe).
 * `startDate`/`endDate` sont des dates-jour (mode `date`, minuit) : la phase « en cours »
 * inclut toute la journée de fin (on borne à fin de journée = endDate + 1 jour, exclusif).
 * Réutilisé par `/admin/tournois` (epic 8) et le listing public (epic 11).
 */
export type TournamentPhase = 'upcoming' | 'ongoing' | 'past';

export function tournamentPhase(start: Date, end: Date, now: Date = new Date()): TournamentPhase {
	const t = now.getTime();
	const startMs = start.getTime();
	// Fin inclusive : on ajoute 24h à la date de fin (jour entier couvert).
	const endExclusiveMs = end.getTime() + 24 * 60 * 60 * 1000;
	if (t < startMs) return 'upcoming';
	if (t >= endExclusiveMs) return 'past';
	return 'ongoing';
}

export function phaseLabel(phase: TournamentPhase): string {
	switch (phase) {
		case 'upcoming':
			return 'À venir';
		case 'ongoing':
			return 'En cours';
		case 'past':
			return 'Terminé';
	}
}
