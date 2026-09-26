import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

/**
 * Enregistre le téléphone d'un compte. Utilisé depuis la page d'inscription /t/[token] pour
 * débloquer un bénévole sans numéro sans le renvoyer vers /compte (bloqué par le gate PWA
 * sur mobile).
 */
export async function setUserPhone(userId: string, phone: string): Promise<void> {
	await db.update(user).set({ phone, updatedAt: new Date() }).where(eq(user.id, userId));
}
