import { z } from 'zod';

/**
 * Souscription Web Push telle que sérialisée par le navigateur
 * (`PushSubscription.toJSON()`). On ne valide que les champs consommés côté serveur.
 */
export const pushSubscriptionSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({
		p256dh: z.string().min(1),
		auth: z.string().min(1)
	})
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
