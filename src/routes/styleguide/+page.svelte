<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { Select } from '$lib/components/ui/select';

	const posteOptions = [
		{ value: 'buvette', label: 'Buvette' },
		{ value: 'arbitre', label: 'Arbitrage' },
		{ value: 'accueil', label: 'Accueil' }
	];
	let posteValue = $state('buvette');

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
		<h1 class="h1">Styleguide</h1>
		<p class="mt-1 text-ink-muted">Référence vivante du design system — charte ACGB.</p>
	</header>

	<!-- Couleurs -->
	<section class="space-y-3">
		<h2 class="h2">Couleurs</h2>
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
		<h2 class="h2">Typographie</h2>
		<p class="display">Display / 2.25rem bold marine</p>
		<p class="h1">H1 / 1.75rem bold marine</p>
		<p class="h2">H2 / 1.375rem semibold</p>
		<p class="h3">H3 / 1.125rem semibold</p>
		<p class="text-base text-ink">Corps / 1rem regular — Manrope Variable.</p>
		<p class="text-sm text-ink-muted">Légende / 0.875rem muted.</p>
	</section>

	<!-- Boutons -->
	<section class="space-y-3">
		<h2 class="h2">Boutons</h2>
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="primary">Créer un tournoi</Button>
			<Button variant="secondary">Je suis dispo</Button>
			<Button variant="ghost">Annuler</Button>
			<Button variant="danger">Me désinscrire</Button>
			<Button variant="primary" disabled>Désactivé</Button>
		</div>
		<p class="text-sm text-ink-muted">Taille small</p>
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="primary" size="sm">Créer un tournoi</Button>
			<Button variant="secondary" size="sm">Je suis dispo</Button>
			<Button variant="ghost" size="sm">Annuler</Button>
			<Button variant="danger" size="sm">Me désinscrire</Button>
			<Button variant="primary" size="sm" disabled>Désactivé</Button>
		</div>
	</section>

	<!-- Status badges -->
	<section class="space-y-3">
		<h2 class="h2">Statuts d'inscription</h2>
		<div class="flex flex-wrap gap-3">
			<StatusBadge status="available" />
			<StatusBadge status="maybe" />
			<StatusBadge status="full" />
		</div>
	</section>

	<!-- Select -->
	<section class="space-y-3">
		<h2 class="h2">Select</h2>
		<div class="max-w-xs">
			<Select bind:value={posteValue} options={posteOptions} />
		</div>
		<p class="text-sm text-ink-muted">Valeur : {posteValue}</p>
	</section>

	<!-- Tableau récap -->
	<section class="space-y-3">
		<h2 class="h2">Tableau récap</h2>
		<div class="overflow-x-auto rounded-lg border border-border">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-border bg-surface-subtle text-left">
						<th class="px-3 py-2.5 font-semibold text-ink-strong">Bénévole</th>
						<th class="px-3 py-2.5 font-semibold text-ink-strong">Poste</th>
						<th class="px-3 py-2.5 font-semibold text-ink-strong">Statut</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b border-border/60 hover:bg-surface-subtle">
						<td class="px-3 py-2.5 text-ink-strong">Alice</td>
						<td class="px-3 py-2.5 text-ink">Buvette</td>
						<td class="px-3 py-2.5"><StatusBadge status="available" /></td>
					</tr>
					<tr class="hover:bg-surface-subtle">
						<td class="px-3 py-2.5 text-ink-muted">—</td>
						<td class="px-3 py-2.5 text-ink">Arbitrage</td>
						<td class="px-3 py-2.5">
							<span
								class="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-sm font-medium text-ink-muted"
							>
								À pourvoir
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Motion -->
	<section class="space-y-3">
		<h2 class="h2">Motion — fade-up (5/10)</h2>
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
