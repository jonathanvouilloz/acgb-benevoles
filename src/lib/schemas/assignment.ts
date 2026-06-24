import { z } from 'zod';

/**
 * Validation des actions d'édition d'affectations (vue suivi organisateur).
 * Les `userId` sont des identifiants Better Auth (texte/nanoid, pas des UUID) ; les
 * `shiftId` sont des UUID de créneaux.
 */

const shiftId = z.string().uuid('Créneau invalide');
const userId = z.string().min(1, 'Bénévole invalide');

/** Déplacer une inscription (shiftId, userId) vers un autre créneau du même tournoi. */
export const moveSchema = z.object({
	shiftId,
	userId,
	targetShiftId: shiftId
});

/** Échanger deux inscriptions entre leurs créneaux. */
export const swapSchema = z.object({
	aShiftId: shiftId,
	aUserId: userId,
	bShiftId: shiftId,
	bUserId: userId
});

export type MoveInput = z.infer<typeof moveSchema>;
export type SwapInput = z.infer<typeof swapSchema>;
