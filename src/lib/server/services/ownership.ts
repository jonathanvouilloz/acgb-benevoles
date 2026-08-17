import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';

/**
 * Gardes de propriété partagées entre services (cf. docs/STYLEGUIDE.md : la logique métier vit
 * dans les services, les routes orchestrent). Extraites de `position-service.ts` quand
 * l'annuaire bénévole et la recherche (Epic 14) en sont devenus consommateurs.
 *
 * Convention : `throw new Error('FORBIDDEN')`, mappé en 403/404 par la route appelante.
 */

/** Vérifie que le tournoi appartient bien à l'organisateur. Throw 'FORBIDDEN' sinon. */
export async function assertTournamentOwner(
	tournamentId: string,
	organizerId: string
): Promise<void> {
	const rows = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.organizerId, organizerId)))
		.limit(1);
	if (rows.length === 0) throw new Error('FORBIDDEN');
}

/** Variante non levante : `true` si `organizerId` possède le tournoi. */
export async function isTournamentOwner(
	tournamentId: string,
	organizerId: string
): Promise<boolean> {
	const rows = await db
		.select({ id: tournament.id })
		.from(tournament)
		.where(and(eq(tournament.id, tournamentId), eq(tournament.organizerId, organizerId)))
		.limit(1);
	return rows.length > 0;
}
