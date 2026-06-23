import { z } from 'zod';

/**
 * Validation des actions d'inscription bénévole (page publique /t/[token]).
 * Le statut reprend l'enum DB `signup_status`. `shiftId` désigne le créneau ciblé.
 */
export const statusSchema = z.enum(['available', 'maybe'], { message: 'Statut invalide' });

export const signupSchema = z.object({
	shiftId: z.string().uuid('Créneau invalide'),
	status: statusSchema
});

export type SignupStatus = z.infer<typeof statusSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
