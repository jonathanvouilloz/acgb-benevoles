import { z } from 'zod';
import { phoneSchema } from './auth';

/** Mise à jour du profil (page /compte) : nom et téléphone requis. */
export const accountSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100),
	phone: phoneSchema
});

export type AccountInput = z.infer<typeof accountSchema>;
