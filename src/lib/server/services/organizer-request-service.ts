import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organizerRequest, type OrganizerRequest } from '$lib/server/db/schema';

/** Dernière demande de promotion organisateur de l'utilisateur (null si aucune). */
export async function getMyLatestRequest(userId: string): Promise<OrganizerRequest | null> {
	const [row] = await db
		.select()
		.from(organizerRequest)
		.where(eq(organizerRequest.userId, userId))
		.orderBy(desc(organizerRequest.createdAt))
		.limit(1);
	return row ?? null;
}

/**
 * Crée une demande de promotion organisateur.
 * Idempotent côté produit : refuse si une demande `pending` existe déjà (retourne `false`).
 */
export async function createOrganizerRequest(
	userId: string,
	message?: string | null
): Promise<boolean> {
	const [pending] = await db
		.select({ id: organizerRequest.id })
		.from(organizerRequest)
		.where(and(eq(organizerRequest.userId, userId), eq(organizerRequest.status, 'pending')))
		.limit(1);
	if (pending) return false;

	await db.insert(organizerRequest).values({
		userId,
		message: message?.trim() || null
	});
	return true;
}
