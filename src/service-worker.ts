/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `acgb-cache-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	// Cache-first pour les assets précachés ; le reste passe par le réseau.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
	}
});

/* --------------------------------------------------------------------------
 * Push notifications — branché en Epic 6 (cf. docs/features/06-notifications.md)
 * Squelette prêt : décommenter et compléter avec le payload des rappels.
 * --------------------------------------------------------------------------
 *
 * sw.addEventListener('push', (event) => {
 *   const data = event.data?.json() ?? {};
 *   event.waitUntil(
 *     sw.registration.showNotification(data.title ?? 'ACGB', {
 *       body: data.body,
 *       icon: '/icon.svg',
 *       data: { url: data.url ?? '/' }
 *     })
 *   );
 * });
 *
 * sw.addEventListener('notificationclick', (event) => {
 *   event.notification.close();
 *   const url = event.notification.data?.url ?? '/';
 *   event.waitUntil(sw.clients.openWindow(url));
 * });
 */

export {};
