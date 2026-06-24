<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import type { Option } from '$lib/time-options';
	import { Download, Table2, LayoutGrid, Search } from 'lucide-svelte';

	let {
		search = $bindable(''),
		positionFilter = $bindable('all'),
		dayFilter = $bindable('all'),
		statusFilter = $bindable('all'),
		view = $bindable('table'),
		positionOptions,
		dayFilterOptions,
		onExport
	}: {
		search?: string;
		positionFilter?: string;
		dayFilter?: string;
		statusFilter?: string;
		view?: 'table' | 'matrix';
		positionOptions: Option[];
		dayFilterOptions: Option[];
		onExport: () => void;
	} = $props();

	const statusOptions: Option[] = [
		{ value: 'all', label: 'Tous les statuts' },
		{ value: 'available', label: 'Disponible' },
		{ value: 'maybe', label: 'Peut-être' },
		{ value: 'empty', label: 'À pourvoir' }
	];
</script>

<div class="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
	<div class="flex flex-wrap items-center gap-2">
		<!-- Recherche bénévole -->
		<div class="relative min-w-44 flex-1">
			<Search
				size={16}
				class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
			/>
			<Input
				type="search"
				placeholder="Rechercher un bénévole…"
				bind:value={search}
				class="pl-9"
			/>
		</div>

		<!-- Bascule de vue -->
		<div class="flex shrink-0 overflow-hidden rounded border border-border">
			<button
				type="button"
				onclick={() => (view = 'table')}
				class="inline-flex min-h-8 items-center gap-1.5 px-3 text-sm font-medium transition duration-150 {view ===
				'table'
					? 'skin-glossy skin-primary text-white'
					: 'bg-surface text-ink-muted hover:bg-surface-muted'}"
			>
				<Table2 size={15} /> Tableau
			</button>
			<button
				type="button"
				onclick={() => (view = 'matrix')}
				class="inline-flex min-h-8 items-center gap-1.5 border-l border-border px-3 text-sm font-medium transition duration-150 {view ===
				'matrix'
					? 'skin-glossy skin-primary text-white'
					: 'bg-surface text-ink-muted hover:bg-surface-muted'}"
			>
				<LayoutGrid size={15} /> Matrice
			</button>
		</div>

		<Button type="button" variant="ghost" size="sm" onclick={onExport} class="shrink-0">
			<Download size={15} /> CSV
		</Button>
	</div>

	<!-- Filtres -->
	<div class="flex flex-wrap gap-2">
		<Select bind:value={positionFilter} options={positionOptions} class="flex-1" />
		<Select bind:value={dayFilter} options={dayFilterOptions} class="flex-1" />
		<Select bind:value={statusFilter} options={statusOptions} class="flex-1" />
	</div>
</div>
