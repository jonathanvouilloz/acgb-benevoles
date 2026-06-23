<script lang="ts">
	import { resolve } from '$app/paths';
	import TrackingShiftRow from '$lib/components/tournament/TrackingShiftRow.svelte';
	import { formatDateRange } from '$lib/format';
	import { ArrowLeft, MapPin, CalendarDays } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const t = $derived(data.tournament);

	/** Agrégat tous créneaux confondus, pour le bandeau de synthèse « coup d'œil ». */
	const summary = $derived.by(() => {
		let filled = 0;
		let capacity = 0;
		let shifts = 0;
		let unfilled = 0;
		for (const p of t.positions) {
			for (const s of p.shifts) {
				filled += s.availableCount;
				capacity += s.capacity;
				shifts += 1;
				if (!s.isFull) unfilled += 1;
			}
		}
		return { filled, capacity, shifts, unfilled };
	});
</script>

<svelte:head><title>Suivi — {t.name} — Bénévoles ACGB</title></svelte:head>

<a
	href={resolve('/tournois/[id]', { id: t.id })}
	class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
>
	<ArrowLeft size={16} /> Gestion du tournoi
</a>

<!-- En-tête -->
<div class="mt-3">
	<h1 class="text-2xl font-bold text-ink-strong">{t.name}</h1>
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
</div>

<!-- Synthèse -->
<div class="mt-4 flex flex-wrap gap-3 rounded-lg border border-border bg-surface-subtle p-4">
	<div class="flex-1">
		<p class="text-2xl font-bold text-ink-strong">{summary.filled}/{summary.capacity}</p>
		<p class="text-sm text-ink-muted">places pourvues</p>
	</div>
	<div class="flex-1">
		<p
			class="text-2xl font-bold"
			class:text-success={summary.unfilled === 0}
			class:text-warning={summary.unfilled > 0}
		>
			{summary.unfilled}
		</p>
		<p class="text-sm text-ink-muted">
			créneau{summary.unfilled > 1 ? 'x' : ''} à compléter
			<span class="text-ink-muted/70">/ {summary.shifts}</span>
		</p>
	</div>
</div>

<!-- Postes -->
{#if t.positions.length === 0}
	<p class="mt-8 text-sm text-ink-muted">Aucun poste pour ce tournoi.</p>
{:else}
	<div class="mt-8 flex flex-col gap-6">
		{#each t.positions as position (position.id)}
			<section>
				<div class="flex items-center gap-2">
					<span class="size-3 shrink-0 rounded-full" style="background-color: {position.color}"></span>
					<h2 class="text-lg font-semibold text-ink-strong">{position.name}</h2>
				</div>
				{#if position.description}
					<p class="mt-0.5 text-sm text-ink-muted">{position.description}</p>
				{/if}

				{#if position.shifts.length === 0}
					<p class="mt-2 text-sm text-ink-muted">Aucun créneau.</p>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each position.shifts as shift (shift.id)}
							<TrackingShiftRow {shift} />
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>
{/if}
