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

/** Un créneau cible (cellule vide) — pour un déplacement ou une inscription. */
export type ShiftRef = {
	shiftId: string;
	positionName: string;
	dayLabel: string;
	timeLabel: string;
	/** Places encore à pourvoir, affichées dans la modale d'inscription. */
	remaining?: number;
	capacity?: number;
};

/** Un bénévole déjà présent en ligne de matrice, pour l'inscrire sur un autre créneau. */
export type VolunteerRef = { userId: string; name: string };

export type AssignRequest =
	| { type: 'swap'; a: CellRef; b: CellRef }
	| { type: 'move'; from: CellRef; target: ShiftRef }
	/** Retrait d'un bénévole d'un créneau (Epic 14). */
	| { type: 'remove'; cell: CellRef }
	/**
	 * Inscription par l'organisateur (Epic 14). `target` et `volunteer` sont tous deux optionnels :
	 * la modale s'ouvre pré-remplie depuis une cellule vide (les deux), depuis la ligne
	 * « À pourvoir » (créneau seul) ou depuis la toolbar (rien).
	 */
	| { type: 'assign'; target?: ShiftRef; volunteer?: VolunteerRef };

/**
 * Sous-ensemble traité par `AssignmentDialog` (confirmation d'échange / déplacement).
 * `remove` et `assign` ont leur propre modale : les exclure ici garde le narrowing du composant
 * exhaustif au lieu de le laisser supposer que « pas swap » signifie « move ».
 */
export type MoveOrSwapRequest = Extract<AssignRequest, { type: 'move' | 'swap' }>;
