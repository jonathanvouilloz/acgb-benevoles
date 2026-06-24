/**
 * Types partagés pour l'édition d'affectations depuis la matrice (organisateur) :
 * sélection d'une cellule source puis d'une cible → échange (swap) ou déplacement (move).
 */

/** Une cellule occupée : un bénévole inscrit sur un créneau précis. */
export type CellRef = {
	userId: string;
	name: string;
	shiftId: string;
	positionName: string;
	dayLabel: string;
	timeLabel: string;
	status: 'available' | 'maybe';
};

/** Un créneau cible (cellule vide) — pour un déplacement. */
export type ShiftRef = {
	shiftId: string;
	positionName: string;
	dayLabel: string;
	timeLabel: string;
};

export type AssignRequest =
	| { type: 'swap'; a: CellRef; b: CellRef }
	| { type: 'move'; from: CellRef; target: ShiftRef };
