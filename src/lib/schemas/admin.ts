import { z } from 'zod';
import { phoneSchema } from './auth';

/** Rôles assignables depuis l'admin (source de vérité : userRole dans schema.ts). */
export const roleSchema = z.enum(['volunteer', 'organizer', 'super_admin']);

/** Création d'un compte organisateur par le super admin (téléphone optionnel : complété plus tard). */
export const createOrganizerSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100),
	email: z.string().trim().toLowerCase().email('Email invalide'),
	phone: phoneSchema.optional().or(z.literal('').transform(() => undefined))
});

export type CreateOrganizerInput = z.infer<typeof createOrganizerSchema>;
