import { z } from 'zod';

/** Validation d'un poste (ex. « Buvette », « Accueil »). La couleur est auto-assignée côté service. */
export const positionSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(60, 'Nom trop long'),
	description: z.string().trim().max(200, 'Description trop longue').optional()
});

export type PositionInput = z.infer<typeof positionSchema>;
