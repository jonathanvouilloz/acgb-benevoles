<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import RecapToolbar from '$lib/components/tracking/RecapToolbar.svelte';
	import RecapTable from '$lib/components/tracking/RecapTable.svelte';
	import RecapMatrix from '$lib/components/tracking/RecapMatrix.svelte';
	import RecapByVolunteer from '$lib/components/tracking/RecapByVolunteer.svelte';
	import AssignmentDialog from '$lib/components/tracking/AssignmentDialog.svelte';
	import ExportDialog from '$lib/components/tracking/ExportDialog.svelte';
	import type { AssignRequest } from '$lib/components/tracking/assignment-types';
	import PlanningList from '$lib/components/tracking/PlanningList.svelte';
	import PrintPlanning from '$lib/components/tracking/PrintPlanning.svelte';
	import { formatDateRange, toDateInputValue } from '$lib/format';
	import { flattenTournament, planningByPoste } from '$lib/recap';
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
	let view = $state<'table' | 'matrix' | 'byVolunteer'>('matrix');

	/** Planning groupé par poste — source de la vue empilée mobile (filtres poste + jour). */
	const postes = $derived(planningByPoste(t, { positionId: positionFilter, day: dayFilter }));

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

	/**
	 * Bénévoles visibles après recherche/filtres — utilisé pour restreindre les lignes de la
	 * matrice (qui, sinon, lit le tournoi brut et ignorait la recherche : bug corrigé).
	 */
	const visibleVolunteerIds = $derived(
		new Set(filtered.filter((r) => r.status !== 'empty' && r.userId).map((r) => r.userId))
	);

	/** Requête d'affectation en attente de confirmation (échange / déplacement). */
	let pending = $state<AssignRequest | null>(null);

	/** Ouverture de la modale d'export Excel (choix du format). */
	let exportOpen = $state(false);

	let printFormat = $state<'poste' | 'matrix'>('poste');

	/** Choisit la mise en page d'impression puis ouvre le dialogue navigateur (→ « Enregistrer en PDF »). */
	async function print(format: 'poste' | 'matrix') {
		printFormat = format;
		await tick();
		window.print();
	}
</script>

<svelte:head><title>Suivi — {t.name} — Bénévoles ACGB</title></svelte:head>

<!-- Chrome de page centré (la matrice, elle, exploite toute la largeur écran) -->
<div class="mx-auto w-full max-w-5xl">
	<a
		href={resolve('/tournois/[id]', { id: t.id })}
		class="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink print:hidden"
	>
		<ArrowLeft size={16} /> Gestion du tournoi
	</a>

	<!-- En-tête -->
	<div class="mt-3 print:hidden">
		<h1 class="h1">{t.name}</h1>
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
	<div
		class="mt-4 flex flex-wrap gap-3 rounded-lg border border-border bg-surface-subtle p-4 print:hidden"
	>
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
</div>

<!-- Récap -->
{#if t.positions.length === 0}
	<p class="mx-auto mt-8 w-full max-w-5xl text-sm text-ink-muted print:hidden">
		Aucun poste pour ce tournoi.
	</p>
{:else}
	<div class="fade-up mt-6 flex flex-col gap-4 print:hidden">
		<!-- Toolbar + vue mobile : centrées avec le chrome -->
		<div class="mx-auto w-full max-w-5xl">
			<RecapToolbar
				bind:search
				bind:positionFilter
				bind:dayFilter
				bind:statusFilter
				bind:view
				{positionOptions}
				{dayFilterOptions}
				onExport={() => (exportOpen = true)}
				onPrint={print}
			/>
		</div>

		<!-- Mobile : vue empilée par créneau (lecture verticale, aucun scroll horizontal) -->
		<div class="mx-auto w-full max-w-5xl lg:hidden">
			<PlanningList {postes} />
		</div>

		<!-- Desktop : pleine largeur. Matrice = grille bornée (en-têtes + noms figés). -->
		<div class="hidden lg:block">
			{#if view === 'table'}
				<div class="mx-auto w-full max-w-5xl">
					<RecapTable rows={filtered} />
				</div>
			{:else if view === 'byVolunteer'}
				<div class="mx-auto w-full max-w-5xl">
					<RecapByVolunteer rows={filtered} />
				</div>
			{:else}
				<RecapMatrix
					tournament={t}
					positionId={positionFilter}
					day={dayFilter}
					volunteerIds={visibleVolunteerIds}
					{statusFilter}
					interactive
					onAssign={(req) => (pending = req)}
				/>
			{/if}
		</div>
	</div>
{/if}

<!-- Confirmation d'échange / déplacement (matrice interactive) -->
<AssignmentDialog request={pending} onclose={() => (pending = null)} />

<!-- Export Excel multi-format -->
<ExportDialog bind:open={exportOpen} tournament={t} />

<!-- Planning imprimable (invisible à l'écran, A4 paysage) -->
<PrintPlanning tournament={t} format={printFormat} positionId={positionFilter} day={dayFilter} />
