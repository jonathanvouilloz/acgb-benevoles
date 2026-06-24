import { z } from 'zod';

/**
 * Validation des actions d'inscription bénévole (page publique /t/[token]).
 * Le statut reprend l'enum DB `signup_status`. `shiftId` désigne le créneau ciblé.
 */
export const statusSchema = z.enum(['available', 'maybe'], { message: 'Statut invalide' });

/** Note libre optionnelle (vide → undefined). */
export const noteSchema = z
	.string()
	.trim()
	.max(280, 'Note trop longue (280 caractères max)')
	.optional()
	.or(z.literal('').transform(() => undefined));

export const signupSchema = z.object({
	shiftId: z.string().uuid('Créneau invalide'),
	status: statusSchema,
	note: noteSchema
});

/** Édition de la seule note d'une inscription. */
export const noteUpdateSchema = z.object({
	shiftId: z.string().uuid('Créneau invalide'),
	note: noteSchema
});

export type SignupStatus = z.infer<typeof statusSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
