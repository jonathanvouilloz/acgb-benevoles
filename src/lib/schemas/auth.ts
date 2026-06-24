import { z } from 'zod';

/**
 * Validation du formulaire de connexion. Le prénom et le nom sont saisis au premier usage
 * et combinés en `user.name` (décision MVP, cf. docs/features/02-auth.md).
 */
/** Téléphone obligatoire : format permissif (chiffres, +, espaces, séparateurs). */
export const phoneSchema = z
	.string()
	.trim()
	.min(1, 'Numéro de téléphone requis')
	.regex(/^[+0-9 ().-]{6,20}$/, 'Numéro de téléphone invalide');

const emailField = z.string().trim().toLowerCase().email('Email invalide');

/** Connexion simple (compte existant) : email uniquement. */
export const emailLoginSchema = z.object({
	email: emailField
});

/** Première connexion / création de compte : prénom + nom + email + téléphone (obligatoire). */
export const loginSchema = z.object({
	prenom: z.string().trim().min(1, 'Prénom requis').max(50),
	nom: z.string().trim().min(1, 'Nom requis').max(50),
	email: emailField,
	phone: phoneSchema
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Construit le `name` complet à partir du prénom et du nom. */
export function fullName(input: Pick<LoginInput, 'prenom' | 'nom'>): string {
	return `${input.prenom} ${input.nom}`;
}
