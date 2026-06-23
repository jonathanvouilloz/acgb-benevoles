import { z } from 'zod';

/**
 * Validation de la création / édition d'un tournoi (côté organisateur).
 * Les dates arrivent du formulaire au format `YYYY-MM-DD` (input type="date").
 * La comparaison de chaînes ISO suffit pour ordonner début / fin.
 */
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide');

export const tournamentSchema = z
	.object({
		name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
		location: z.string().trim().max(120, 'Lieu trop long').optional(),
		startDate: dateString,
		endDate: dateString
	})
	.refine((d) => d.endDate >= d.startDate, {
		message: 'La date de fin doit être égale ou postérieure au début',
		path: ['endDate']
	});

export type TournamentInput = z.infer<typeof tournamentSchema>;
