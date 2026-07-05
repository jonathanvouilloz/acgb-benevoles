<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { BellRing, Share, Plus, Download, Copy, Check, Compass } from 'lucide-svelte';
	import { isMobile, isIOS, isStandalone, inAppBrowser } from '$lib/pwa';
	import { pwaInstall, promptInstall } from '$lib/pwa-install.svelte';

	/**
	 * Gate d'installation PWA obligatoire sur l'espace connecté (mobile uniquement).
	 *
	 * Objectif : garantir que les bénévoles utilisent l'app installée, seul contexte où le
	 * Web Push (rappels de créneaux) fonctionne de façon fiable — notamment sur iOS où le
	 * push n'existe qu'en mode standalone. Le desktop et les pages publiques restent libres.
	 *
	 * Trois issues selon le contexte : webview in-app (installation impossible → ouvrir dans
	 * le vrai navigateur), iOS Safari (ajout manuel à l'écran d'accueil), Android/Chrome
	 * (invite d'installation native via `beforeinstallprompt`, sinon menu du navigateur).
	 */

	let { user }: { user: unknown } = $props();

	// Détection figée au montage (stable pour la session) ; `browser`-only.
	let mounted = $state(false);
	let mobile = $state(false);
	let ios = $state(false);
	let standalone = $state(false);
	let inApp = $state<string | null>(null);

	onMount(() => {
		mobile = isMobile();
		ios = isIOS();
		standalone = isStandalone();
		inApp = inAppBrowser();
		mounted = true;
	});

	/** Aperçu design forcé sur desktop : `?pwa-gate-preview=1`. */
	const previewForced = $derived(
		browser && page.url.searchParams.get('pwa-gate-preview') === '1'
	);

	/** Routes de l'espace connecté (le reste — accueil, /t/[token], login — reste libre). */
	function routeGated(path: string): boolean {
		return (
			path === '/compte' ||
			path.startsWith('/compte/') ||
			path === '/tournois' ||
			path.startsWith('/tournois/') ||
			path.startsWith('/admin')
		);
	}

	const visible = $derived(
		mounted &&
			!pwaInstall.installed &&
			(previewForced ||
				(!!user && mobile && !standalone && routeGated(page.url.pathname)))
	);

	// Verrou du scroll de fond tant que le gate est affiché.
	$effect(() => {
		if (!visible) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	let copied = $state(false);
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	let installing = $state(false);
	async function install() {
		installing = true;
		await promptInstall();
		installing = false;
	}
</script>

{#if visible}
	<div
		class="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-surface px-6 py-10 print:hidden"
		style="padding-top: calc(2.5rem + env(safe-area-inset-top)); padding-bottom: calc(2.5rem + env(safe-area-inset-bottom));"
		role="dialog"
		aria-modal="true"
		aria-label="Installation requise"
	>
		<div class="flex w-full max-w-sm flex-col items-center text-center">
			<div
				class="flex size-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary"
			>
				<BellRing size={30} />
			</div>

			{#if inApp}
				<!-- Webview in-app (WhatsApp/Instagram…) : l'installation PWA y est impossible. -->
				<h1 class="mt-5 h1">Ouvre dans ton navigateur</h1>
				<p class="mt-2 text-sm text-ink-muted">
					Tu es dans {inApp}. Pour installer l'app et recevoir les rappels de tes créneaux, ouvre
					ce lien dans {ios ? 'Safari' : 'Chrome'}.
				</p>
				<div
					class="mt-5 w-full rounded-lg border border-border bg-surface-muted/50 p-4 text-left text-sm text-ink"
				>
					<p class="flex items-start gap-2">
						<Compass size={16} class="mt-0.5 shrink-0 text-brand-primary" />
						<span>
							Appuie sur le menu <span class="font-medium">⋯</span> en haut, puis
							<span class="font-medium">
								{ios ? 'Ouvrir dans Safari' : 'Ouvrir dans le navigateur'}
							</span>.
						</span>
					</p>
				</div>
				<Button variant="secondary" class="mt-4 w-full" onclick={copyLink}>
					{#if copied}<Check size={16} /> Lien copié{:else}<Copy size={16} /> Copier le lien{/if}
				</Button>
			{:else if ios}
				<!-- iOS Safari : pas d'installation programmatique, uniquement « Sur l'écran d'accueil ». -->
				<h1 class="mt-5 h1">Installe l'app</h1>
				<p class="mt-2 text-sm text-ink-muted">
					Pour continuer et recevoir les rappels de tes créneaux, ajoute l'app à ton écran
					d'accueil.
				</p>
				<div
					class="mt-5 w-full space-y-3 rounded-lg border border-border bg-surface-muted/50 p-4 text-left text-sm text-ink"
				>
					<p class="flex items-start gap-2">
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary"
							>1</span
						>
						<span>
							Appuie sur <Share size={15} class="inline align-text-bottom text-brand-primary" />
							<span class="font-medium">Partager</span> dans la barre Safari.
						</span>
					</p>
					<p class="flex items-start gap-2">
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary"
							>2</span
						>
						<span>
							Choisis <span class="font-medium">Sur l'écran d'accueil</span>
							<Plus size={15} class="inline align-text-bottom text-brand-primary" />.
						</span>
					</p>
					<p class="flex items-start gap-2">
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary"
							>3</span
						>
						<span>Ouvre l'app depuis sa nouvelle icône.</span>
					</p>
				</div>
			{:else}
				<!-- Android/Chrome (et aperçu desktop) : invite native si dispo, sinon menu navigateur. -->
				<h1 class="mt-5 h1">Installe l'app</h1>
				<p class="mt-2 text-sm text-ink-muted">
					Pour continuer et recevoir les rappels de tes créneaux, installe l'app sur ton
					téléphone.
				</p>
				{#if pwaInstall.prompt}
					<Button class="mt-5 w-full" onclick={install} disabled={installing}>
						<Download size={16} />
						{installing ? 'Installation…' : "Installer l'application"}
					</Button>
				{:else}
					<div
						class="mt-5 w-full rounded-lg border border-border bg-surface-muted/50 p-4 text-left text-sm text-ink"
					>
						<p class="flex items-start gap-2">
							<Download size={16} class="mt-0.5 shrink-0 text-brand-primary" />
							<span>
								Ouvre le menu <span class="font-medium">⋮</span> du navigateur, puis
								<span class="font-medium">Installer l'application</span> (ou
								<span class="font-medium">Ajouter à l'écran d'accueil</span>).
							</span>
						</p>
					</div>
				{/if}
			{/if}

			<p class="mt-6 text-xs text-ink-muted">
				Tu peux continuer à utiliser le site sur ordinateur sans installation.
			</p>
		</div>
	</div>
{/if}
