import { z } from 'zod';
import { phoneSchema } from './auth';

/** Mise à jour du profil (page /compte) : nom et téléphone requis. */
export const accountSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100),
	phone: phoneSchema
});

export type AccountInput = z.infer<typeof accountSchema>;

/** Saisie du seul téléphone (bannière de la page d'inscription /t/[token]). */
export const phoneOnlySchema = z.object({ phone: phoneSchema });
