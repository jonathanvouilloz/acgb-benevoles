<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { StatusBadge } from '$lib/components/ui/status-badge';

	const swatches = [
		{ name: 'brand-primary', var: '--brand-primary' },
		{ name: 'brand-secondary', var: '--brand-secondary' },
		{ name: 'brand-tertiary', var: '--brand-tertiary' },
		{ name: 'brand-cyan', var: '--brand-cyan' },
		{ name: 'success', var: '--success' },
		{ name: 'warning', var: '--warning' },
		{ name: 'error', var: '--error' },
		{ name: 'surface-muted', var: '--surface-muted' }
	];
</script>

<svelte:head>
	<title>Styleguide — ACGB</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-10">
	<header>
		<h1 class="text-2xl font-bold text-ink-strong">Styleguide</h1>
		<p class="mt-1 text-ink-muted">Référence vivante du design system — charte ACGB.</p>
	</header>

	<!-- Couleurs -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-ink-strong">Couleurs</h2>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each swatches as s (s.name)}
				<div class="rounded-lg border border-border p-2">
					<div class="h-12 w-full rounded" style="background: var({s.var})"></div>
					<p class="mt-2 text-xs text-ink-muted">{s.name}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Typographie -->
	<section class="space-y-2">
		<h2 class="text-lg font-semibold text-ink-strong">Typographie</h2>
		<p class="text-2xl font-bold text-ink-strong">Display / 2rem bold</p>
		<p class="text-xl font-bold text-ink-strong">H1 / 1.5rem bold</p>
		<p class="text-lg font-semibold text-ink-strong">H2 / 1.25rem semibold</p>
		<p class="text-base text-ink">Corps / 1rem regular — Manrope Variable.</p>
		<p class="text-sm text-ink-muted">Légende / 0.875rem muted.</p>
	</section>

	<!-- Boutons -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-ink-strong">Boutons</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="primary">Créer un tournoi</Button>
			<Button variant="secondary">Je suis dispo</Button>
			<Button variant="ghost">Annuler</Button>
			<Button variant="danger">Me désinscrire</Button>
			<Button variant="primary" disabled>Désactivé</Button>
		</div>
	</section>

	<!-- Status badges -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-ink-strong">Statuts d'inscription</h2>
		<div class="flex flex-wrap gap-3">
			<StatusBadge status="available" />
			<StatusBadge status="maybe" />
			<StatusBadge status="full" />
		</div>
	</section>

	<!-- Motion -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-ink-strong">Motion — fade-up (5/10)</h2>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
			{#each ['Buvette', 'Arbitre', 'Accueil'] as item, i (item)}
				<div
					class="fade-up rounded-lg border border-border bg-surface-subtle p-4 text-ink"
					style="animation-delay: {i * 60}ms"
				>
					{item}
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.fade-up {
		animation: fade-up var(--dur-reveal) var(--ease-out-strong) both;
	}
	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fade-up {
			animation: none;
		}
	}
</style>
