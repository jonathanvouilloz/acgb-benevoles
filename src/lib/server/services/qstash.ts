import { Client } from '@upstash/qstash';
import { env } from '$env/dynamic/private';

/**
 * Socle QStash partagé par les planificateurs différés (rappels de créneau, récap email).
 *
 * Extrait de `reminder-scheduler` quand un deuxième planificateur est apparu : dupliquer le
 * client, c'était aussi dupliquer le piège du `:` interdit dans un `deduplicationId`.
 *
 * Doctrine commune à tous les appelants : **on planifie, on n'annule jamais**. Chaque message
 * porte de quoi vérifier sa propre fraîcheur, et le récepteur le drop s'il est périmé. Aucune
 * panne QStash ne doit faire échouer l'action métier qui l'a déclenché.
 */

let resolved = false;
let client: Client | null = null;

/** Client QStash mémoïsé, ou `null` si `QSTASH_TOKEN` absent (dev sans QStash → planif ignorée). */
export function getQstashClient(): Client | null {
	if (!resolved) {
		resolved = true;
		client = env.QSTASH_TOKEN
			? new Client({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL || undefined })
			: null;
	}
	return client;
}

/**
 * URL publique appelée par QStash pour `path`. QStash n'atteint pas localhost → HTTPS public
 * requis en prod. **Doit correspondre exactement** à l'URL que le récepteur reconstruit pour
 * `Receiver.verify()` : un `BETTER_AUTH_URL` désaligné produit des 401 en silence.
 */
export function publicUrl(path: string): string {
	const base = (env.BETTER_AUTH_URL ?? '').replace(/\/$/, '');
	return `${base}${path}`;
}

/**
 * Identifiant de déduplication sûr : QStash rejette les `:` (400), on joint donc en `_` et on
 * neutralise tout caractère hors `[A-Za-z0-9_-]`.
 */
export function safeDedupId(...parts: (string | number)[]): string {
	return parts.map((p) => String(p).replace(/[^A-Za-z0-9_-]/g, '')).join('_');
}
