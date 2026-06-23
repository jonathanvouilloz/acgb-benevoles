import { z } from 'zod';

/**
 * Validation du formulaire de connexion. Le prénom et le nom sont saisis au premier usage
 * et combinés en `user.name` (décision MVP, cf. docs/features/02-auth.md).
 */
export const loginSchema = z.object({
	prenom: z.string().trim().min(1, 'Prénom requis').max(50),
	nom: z.string().trim().min(1, 'Nom requis').max(50),
	email: z.string().trim().toLowerCase().email('Email invalide')
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Construit le `name` complet à partir du prénom et du nom. */
export function fullName(input: Pick<LoginInput, 'prenom' | 'nom'>): string {
	return `${input.prenom} ${input.nom}`;
}
