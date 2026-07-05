<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/manrope';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/toast';
	import { ConfirmDialog } from '$lib/components/ui/confirm';
	import Navbar from '$lib/components/nav/Navbar.svelte';
	import BottomNav from '$lib/components/nav/BottomNav.svelte';
	import PwaInstallGate from '$lib/components/pwa/PwaInstallGate.svelte';
	import '$lib/pwa-install.svelte'; // enregistre le listener beforeinstallprompt au plus tôt
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	/**
	 * Largeur du contenu adaptée à la nature de la page (fin de l'ancienne colonne 640 unique) :
	 * - matrice de suivi : quasi pleine largeur ;
	 * - listings / gestion / admin : large (grilles multi-colonnes en desktop) ;
	 * - inscription bénévole : intermédiaire ;
	 * - formulaires & lecture (accueil, compte, login) : colonne étroite centrée.
	 */
	function contentMax(path: string): string {
		if (path.endsWith('/suivi')) return 'max-w-[95vw]';
		if (path.startsWith('/admin')) return 'max-w-5xl';
		if (path === '/tournois-publics') return 'max-w-5xl';
		if (path === '/tournois/nouveau') return 'max-w-3xl';
		if (path.startsWith('/tournois/')) return 'max-w-3xl';
		if (path === '/tournois') return 'max-w-5xl';
		if (path.startsWith('/t/')) return 'max-w-3xl';
		return 'max-w-2xl';
	}

	const maxW = $derived(contentMax(page.url.pathname));
</script>

<svelte:head><link rel="icon" href="/icon.png" /></svelte:head>

<div class="flex min-h-dvh flex-col">
	<Navbar
		user={data.user}
		viewMode={data.viewMode}
		upcomingShifts={data.upcomingShifts}
		imminentCount={data.imminentCount}
	/>

	<main
		class="mx-auto w-full flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-6 print:p-0 {maxW}"
	>
		{#if data.prototype}
			<p
				class="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-center text-xs font-medium text-ink-muted print:hidden"
			>
				Mode démo — connexion sans email, données de test
			</p>
		{/if}

		{@render children()}
	</main>

	<BottomNav user={data.user} viewMode={data.viewMode} imminentCount={data.imminentCount} />
</div>

<!-- Singletons globaux : feedback transitoire + confirmations + gate d'installation PWA -->
<div class="print:hidden">
	<Toaster />
	<ConfirmDialog />
	<PwaInstallGate user={data.user} />
</div>
