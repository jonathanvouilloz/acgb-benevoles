<script lang="ts">
	import { page, navigating } from '$app/state';
	import { buildTabs, isActive, type NavUser, type ViewMode } from '$lib/nav-model';

	let {
		user,
		viewMode,
		imminentCount = 0
	}: { user: NavUser; viewMode: ViewMode; imminentCount?: number } = $props();

	// Chemin « optimiste » : on suit la cible de navigation dès le tap (avant même
	// que la page soit chargée), sinon l'URL committée. La pastille glisse tout de
	// suite, sans attendre le `load` de la page de destination.
	const path = $derived(navigating.to?.url.pathname ?? page.url.pathname);
	const tabs = $derived(buildTabs(user, viewMode));
	const activeIndex = $derived(tabs.findIndex((t) => isActive(path, t.href)));

	// Indicateur (pastille) glissant : mesure de la géométrie de l'onglet actif,
	// animée en CSS (left/width). Fallback propre tant que la mesure n'est pas prête.
	let tabEls = $state<HTMLAnchorElement[]>([]);
	let pill = $state({ left: 0, width: 0, ready: false });
	// L'animation n'est activée qu'après le placement initial (évite un glissé
	// parasite depuis le bord gauche au tout premier rendu).
	let animate = $state(false);

	function measure() {
		const el = tabEls[activeIndex];
		if (!el) {
			pill = { ...pill, ready: false };
			return;
		}
		pill = { left: el.offsetLeft, width: el.offsetWidth, ready: true };
	}

	// Recalcule au changement de route / d'onglets (switch de vue, rôle).
	$effect(() => {
		void path;
		void tabs;
		measure();
	});

	// Active la transition seulement après que le placement initial est peint.
	$effect(() => {
		if (pill.ready && !animate) {
			const id = requestAnimationFrame(() => (animate = true));
			return () => cancelAnimationFrame(id);
		}
	});

	// Recalcule si la barre est redimensionnée (rotation, resize).
	$effect(() => {
		const on = () => measure();
		window.addEventListener('resize', on);
		return () => window.removeEventListener('resize', on);
	});

	function badgeFor(key: string | undefined): number {
		return key === 'imminent' ? imminentCount : 0;
	}
</script>

<nav class="floating-nav fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 lg:hidden print:hidden" aria-label="Navigation principale">
	<div
		class="relative flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2 py-2 shadow-md backdrop-blur-md"
	>
		<!-- Pastille active glissante -->
		<span
			aria-hidden="true"
			class="pill pointer-events-none absolute top-2 bottom-2 rounded-full bg-brand-primary/10"
			class:ready={pill.ready}
			class:animate
			style="left: {pill.left}px; width: {pill.width}px;"
		></span>

		{#each tabs as tab, i (tab.href + tab.label)}
			{@const active = isActive(path, tab.href)}
			{@const badge = badgeFor(tab.badgeKey)}
			<a
				bind:this={tabEls[i]}
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class="relative z-10 flex min-h-[3rem] items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors
					{active ? 'text-brand-primary' : 'text-ink-muted hover:text-ink'}"
			>
				<span class="relative flex shrink-0 items-center justify-center">
					<tab.Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
					{#if badge > 0}
						<span
							class="absolute -top-1.5 -right-2 flex min-w-[1.05rem] items-center justify-center rounded-full bg-error px-1 py-px text-[0.6rem] font-bold leading-none text-white shadow-sm"
						>
							{badge > 9 ? '9+' : badge}
							<span class="sr-only"> créneaux imminents</span>
						</span>
					{/if}
				</span>
				{#if active}
					<span class="nav-label whitespace-nowrap leading-none">{tab.label}</span>
				{/if}
			</a>
		{/each}
	</div>
</nav>

<style>
	.floating-nav {
		/* Barre détachée du bord + safe-area PWA (encoche / barre home iOS). */
		padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
	}

	.pill {
		/* Cachée tant que la géométrie n'est pas mesurée (évite un flash en 0,0). */
		opacity: 0;
	}
	.pill.ready {
		opacity: 1;
	}
	/* Transition activée seulement après le 1er placement → pas de glissé au load. */
	.pill.animate {
		transition:
			left var(--dur-base, 250ms) var(--ease-drawer, ease),
			width var(--dur-base, 250ms) var(--ease-drawer, ease);
	}

	.nav-label {
		animation: label-in var(--dur-base, 250ms) var(--ease-out-strong, ease-out);
	}
	@keyframes label-in {
		from {
			opacity: 0;
			transform: translateX(-4px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pill.animate {
			transition: none;
		}
		.nav-label {
			animation: none;
		}
	}
</style>
