<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { BellRing, BellOff, Check, Share, Plus } from 'lucide-svelte';

	/**
	 * Opt-in aux rappels push (Epic 6). Dégradation gracieuse : ne s'affiche que si le
	 * navigateur supporte Web Push, qu'une clé VAPID publique est configurée, et tant que
	 * l'utilisateur n'a pas refusé. Réservé aux bénévoles connectés (souscription liée au user).
	 */

	type State =
		| 'checking'
		| 'idle'
		| 'working'
		| 'subscribed'
		| 'denied'
		| 'unsupported'
		| 'ios-install'
		| 'error';
	let state = $state<State>('checking');

	const supported = () =>
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window &&
		!!env.PUBLIC_VAPID_KEY;

	/** iPhone/iPad (iPadOS récent se déclare « Macintosh » + écran tactile). */
	const isIOS = () =>
		/iPhone|iPad|iPod/.test(navigator.userAgent) ||
		(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

	/** PWA installée (ajoutée à l'écran d'accueil) → Web Push devient disponible sur iOS. */
	const isStandalone = () =>
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;

	onMount(async () => {
		if (!supported()) {
			// iOS hors PWA : le push n'est possible qu'une fois l'app installée (limite Apple).
			state = isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
			return;
		}
		if (Notification.permission === 'denied') {
			state = 'denied';
			return;
		}
		// Déjà abonné sur cet appareil ?
		const reg = await navigator.serviceWorker.ready;
		const existing = await reg.pushManager.getSubscription();
		state = existing ? 'subscribed' : 'idle';
	});

	/** base64url (clé VAPID) → Uint8Array pour `applicationServerKey`. */
	function urlBase64ToUint8Array(base64: string): Uint8Array {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(normalized);
		const out = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
		return out;
	}

	async function enable() {
		state = 'working';
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				state = permission === 'denied' ? 'denied' : 'idle';
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub =
				(await reg.pushManager.getSubscription()) ??
				(await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(env.PUBLIC_VAPID_KEY) as BufferSource
				}));

			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(sub.toJSON())
			});
			if (!res.ok) throw new Error('save failed');
			state = 'subscribed';
		} catch {
			state = 'error';
		}
	}
</script>

{#if state === 'idle' || state === 'working' || state === 'error'}
	<div
		class="flex flex-col gap-3 rounded-lg border border-info/40 bg-info/10 p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-start gap-2">
			<BellRing size={18} class="mt-0.5 shrink-0 text-info" />
			<div class="text-sm text-ink">
				<p class="font-medium text-ink-strong">Active les rappels</p>
				<p class="text-ink-muted">
					Reçois une notification avant tes créneaux pour ne rien oublier.
				</p>
				{#if state === 'error'}
					<p class="mt-1 text-error">Échec de l'activation. Réessaie.</p>
				{/if}
			</div>
		</div>
		<Button size="sm" class="w-full sm:w-auto" onclick={enable} disabled={state === 'working'}>
			<BellRing size={16} />
			{state === 'working' ? 'Activation…' : 'Activer'}
		</Button>
	</div>
{:else if state === 'subscribed'}
	<p class="flex items-center gap-1.5 text-sm text-success">
		<Check size={15} class="shrink-0" /> Rappels activés sur cet appareil.
	</p>
{:else if state === 'ios-install'}
	<div class="flex items-start gap-2 rounded-lg border border-info/40 bg-info/10 p-4">
		<BellRing size={18} class="mt-0.5 shrink-0 text-info" />
		<div class="text-sm text-ink">
			<p class="font-medium text-ink-strong">Reçois les rappels sur iPhone</p>
			<p class="text-ink-muted">
				Ajoute l'app à ton écran d'accueil : appuie sur <Share
					size={14}
					class="inline align-text-bottom"
				/>
				<span class="font-medium">Partager</span>, puis
				<span class="font-medium">Sur l'écran d'accueil</span>
				<Plus size={14} class="inline align-text-bottom" />. Ouvre ensuite l'app pour activer les
				rappels.
			</p>
		</div>
	</div>
{:else if state === 'denied'}
	<p class="flex items-center gap-1.5 text-sm text-ink-muted">
		<BellOff size={15} class="shrink-0" /> Notifications bloquées — autorise-les dans les réglages du
		navigateur pour recevoir les rappels.
	</p>
{/if}
