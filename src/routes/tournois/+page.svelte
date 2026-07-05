<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { formatDateRange } from '$lib/format';
	import { MapPin, Plus, CalendarDays } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Mes tournois — Bénévoles ACGB</title></svelte:head>

<div class="flex items-center justify-between gap-3">
	<h1 class="h1">Mes tournois</h1>
	<a href={resolve('/tournois/nouveau')}>
		<Button size="sm">
			<Plus size={18} /> Nouveau
		</Button>
	</a>
</div>

{#if data.tournaments.length === 0}
	<div
		class="mt-8 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-12 text-center"
	>
		<CalendarDays size={32} class="text-ink-muted" />
		<p class="text-ink-muted">Aucun tournoi pour l'instant.</p>
		<a href={resolve('/tournois/nouveau')}>
			<Button size="sm">Créer mon premier tournoi</Button>
		</a>
	</div>
{:else}
	<ul class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.tournaments as t (t.id)}
			<li>
				<a
					href={resolve('/tournois/[id]', { id: t.id })}
					class="block h-full rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand-primary hover:shadow-sm"
				>
					<h2 class="h3">{t.name}</h2>
					<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
						<CalendarDays size={15} />
						{formatDateRange(t.startDate, t.endDate)}
					</p>
					{#if t.location}
						<p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
							<MapPin size={15} />
							{t.location}
						</p>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
