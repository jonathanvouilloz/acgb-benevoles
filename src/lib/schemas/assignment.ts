import { z } from 'zod';
import { noteSchema, statusSchema } from './signup';
import { phoneSchema } from './auth';

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

/**
 * Inscrire un bénévole sur un créneau, à l'initiative de l'organisateur (Epic 14).
 * Deux modes, discriminés pour que le service n'ait pas à deviner :
 * - `existing` : le bénévole a déjà un compte (il s'est inscrit ailleurs) → `userId` ;
 * - `new` : on crée une fiche (nom + téléphone requis). L'email est **facultatif mais décisif** :
 *   avec lui la personne pourra se connecter et retrouver ses créneaux ; sans lui, la fiche
 *   n'existe que dans le tableau de l'organisateur.
 */
export const assignSchema = z.discriminatedUnion('mode', [
	z.object({
		mode: z.literal('existing'),
		shiftId,
		status: statusSchema,
		note: noteSchema,
		userId
	}),
	z.object({
		mode: z.literal('new'),
		shiftId,
		status: statusSchema,
		note: noteSchema,
		name: z.string().trim().min(1, 'Nom requis').max(100),
		phone: phoneSchema,
		email: z
			.string()
			.trim()
			.toLowerCase()
			.email('Email invalide')
			.optional()
			.or(z.literal('').transform(() => undefined))
	})
]);

/** Retirer un bénévole d'un créneau, avec motif facultatif conservé dans l'historique. */
export const removeSchema = z.object({
	shiftId,
	userId,
	reason: z
		.string()
		.trim()
		.max(280, 'Motif trop long (280 caractères max)')
		.optional()
		.or(z.literal('').transform(() => undefined))
});

/** Rattacher un vrai email à une fiche créée sans email (la rend connectable). */
export const attachEmailSchema = z.object({
	userId,
	email: z.string().trim().toLowerCase().email('Email invalide')
});

/**
 * Corriger la fiche d'un bénévole créé par l'organisateur (Epic 15). Contraintes alignées sur
 * `assignSchema` mode `new` — sauf le téléphone, facultatif ici : on doit pouvoir corriger un nom
 * sans être bloqué par un numéro qu'on n'a pas.
 */
export const updateVolunteerSchema = z.object({
	userId,
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
	phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email('Email invalide')
		.optional()
		.or(z.literal('').transform(() => undefined))
});

export type MoveInput = z.infer<typeof moveSchema>;
export type SwapInput = z.infer<typeof swapSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type RemoveInput = z.infer<typeof removeSchema>;
export type AttachEmailInput = z.infer<typeof attachEmailSchema>;
export type UpdateVolunteerInput = z.infer<typeof updateVolunteerSchema>;
