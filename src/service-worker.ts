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
 * Push notifications — rappels de créneau (Epic 6, cf. reminder-service.ts).
 * Payload attendu : { title, body, url } (cf. PushPayload côté serveur).
 * -------------------------------------------------------------------------- */

sw.addEventListener('push', (event) => {
	const data = (() => {
		try {
			return event.data?.json() ?? {};
		} catch {
			return {};
		}
	})();
	event.waitUntil(
		sw.registration.showNotification(data.title ?? 'Bénévoles ACGB', {
			body: data.body,
			icon: '/icon.png',
			badge: '/icon.png',
			data: { url: data.url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url ?? '/';
	event.waitUntil(
		(async () => {
			// Focalise un onglet déjà ouvert sur l'app si possible, sinon en ouvre un.
			const all = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of all) {
				if ('focus' in client) {
					await client.focus();
					if ('navigate' in client) await client.navigate(url);
					return;
				}
			}
			await sw.clients.openWindow(url);
		})()
	);
});

export {};
