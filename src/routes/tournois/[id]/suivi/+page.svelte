<script lang="ts">
	import { resolve } from '$app/paths';
	import RecapToolbar from '$lib/components/tracking/RecapToolbar.svelte';
	import RecapTable from '$lib/components/tracking/RecapTable.svelte';
	import RecapMatrix from '$lib/components/tracking/RecapMatrix.svelte';
	import { formatDateRange, toDateInputValue } from '$lib/format';
	import { flattenTournament, toCsv } from '$lib/recap';
	import { dayOptions } from '$lib/time-options';
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

	// --- Vue récap ---
	const rows = $derived(flattenTournament(t));

	let search = $state('');
	let positionFilter = $state('all');
	let dayFilter = $state('all');
	let statusFilter = $state('all');
	let view = $state<'table' | 'matrix'>('table');

	const positionOptions = $derived([
		{ value: 'all', label: 'Tous les postes' },
		...t.positions.map((p) => ({ value: p.id, label: p.name }))
	]);
	const dayFilterOptions = $derived([
		{ value: 'all', label: 'Tous les jours' },
		...dayOptions(t.startDate, t.endDate)
	]);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return rows.filter((r) => {
			if (q && !r.volunteerName.toLowerCase().includes(q)) return false;
			if (positionFilter !== 'all' && r.positionId !== positionFilter) return false;
			if (dayFilter !== 'all' && toDateInputValue(r.day) !== dayFilter) return false;
			if (statusFilter !== 'all' && r.status !== statusFilter) return false;
			return true;
		});
	});

	function exportCsv() {
		// BOM UTF-8 en tête pour qu'Excel (FR) lise correctement les accents.
		const blob = new Blob(['﻿', toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const slug = t.name
			.replace(/[^a-z0-9]+/gi, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
		a.href = url;
		a.download = `suivi-${slug || 'tournoi'}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head><title>Suivi — {t.name} — Bénévoles ACGB</title></svelte:head>

<a
	href={resolve('/tournois/[id]', { id: t.id })}
	class="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
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

<!-- Récap -->
{#if t.positions.length === 0}
	<p class="mt-8 text-sm text-ink-muted">Aucun poste pour ce tournoi.</p>
{:else}
	<div class="fade-up mt-6 flex flex-col gap-4">
		<RecapToolbar
			bind:search
			bind:positionFilter
			bind:dayFilter
			bind:statusFilter
			bind:view
			{positionOptions}
			{dayFilterOptions}
			onExport={exportCsv}
		/>

		{#if view === 'table'}
			<RecapTable rows={filtered} />
		{:else}
			<RecapMatrix tournament={t} />
		{/if}
	</div>
{/if}
