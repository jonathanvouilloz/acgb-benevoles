import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Rate-limiter « fenêtre fixe » adossé à Postgres.
 *
 * Motivation : les actions de login appellent `auth.api.signInMagicLink(...)` en fonction
 * serveur, ce qui court-circuite le rate-limit HTTP intégré de Better Auth (il ne s'applique
 * qu'au handler `/api/auth/*`). Sans garde, un attaquant peut scripter des POST vers `/login`
 * avec des emails arbitraires → email bombing des tiers + coût Resend. On borne donc les envois
 * par email ET par IP.
 *
 * Choix Postgres (et non compteur mémoire) : sur Vercel serverless, la mémoire n'est pas
 * partagée entre instances → un compteur local se contourne en frappant plusieurs instances.
 * Une ligne unique par `key` avec `ON CONFLICT` rend l'incrément atomique et global.
 */

export type RateLimitResult = {
	/** `true` si la requête est autorisée (sous le seuil), `false` si elle doit être rejetée. */
	ok: boolean;
	/** Secondes restantes avant réinitialisation de la fenêtre (pour un message « réessaie dans… »). */
	retryAfterSec: number;
};

/**
 * Consomme un jeton pour `key` sur une fenêtre de `windowSec` secondes.
 *
 * Incrémente le compteur de la fenêtre courante (ou en démarre une nouvelle si l'ancienne a
 * expiré), le tout dans une seule requête atomique. Renvoie `ok:false` dès que le compteur
 * dépasse `limit` sur la fenêtre. Best-effort : si la DB échoue, on **laisse passer**
 * (`ok:true`) — un rate-limiter ne doit jamais bloquer une connexion légitime sur incident DB.
 *
 * @param key     Identifiant borné (ex. `magic:ip:1.2.3.4`, `magic:email:x@y.z`).
 * @param limit   Nombre maximum de requêtes autorisées sur la fenêtre.
 * @param windowSec Durée de la fenêtre, en secondes.
 */
export async function consumeRateLimit(
	key: string,
	limit: number,
	windowSec: number
): Promise<RateLimitResult> {
	try {
		const res = await db.execute(sql`
			INSERT INTO rate_limit (key, count, expires_at)
			VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
			ON CONFLICT (key) DO UPDATE SET
				count = CASE WHEN rate_limit.expires_at < now() THEN 1 ELSE rate_limit.count + 1 END,
				expires_at = CASE
					WHEN rate_limit.expires_at < now() THEN now() + make_interval(secs => ${windowSec})
					ELSE rate_limit.expires_at
				END
			RETURNING count, ceil(extract(epoch FROM (expires_at - now())))::int AS retry_after
		`);
		const row = res.rows[0] as { count: number; retry_after: number } | undefined;
		if (!row) return { ok: true, retryAfterSec: 0 };
		return { ok: row.count <= limit, retryAfterSec: Math.max(0, row.retry_after) };
	} catch (err) {
		// Fail-open : ne jamais bloquer une connexion sur incident DB.
		console.error('[rate-limit] échec, requête laissée passer :', err);
		return { ok: true, retryAfterSec: 0 };
	}
}
