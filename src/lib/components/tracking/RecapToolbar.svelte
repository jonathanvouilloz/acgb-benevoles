<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import type { Option } from '$lib/time-options';
	import {
		FileSpreadsheet,
		Table2,
		LayoutGrid,
		Users,
		Search,
		Printer,
		ChevronDown
	} from 'lucide-svelte';

	type View = 'table' | 'matrix' | 'byVolunteer';

	let {
		search = $bindable(''),
		positionFilter = $bindable('all'),
		dayFilter = $bindable('all'),
		statusFilter = $bindable('all'),
		view = $bindable('table'),
		positionOptions,
		dayFilterOptions,
		onExport,
		onPrint
	}: {
		search?: string;
		positionFilter?: string;
		dayFilter?: string;
		statusFilter?: string;
		view?: View;
		positionOptions: Option[];
		dayFilterOptions: Option[];
		onExport: () => void;
		onPrint: (format: 'poste' | 'matrix') => void;
	} = $props();

	const views: { value: View; label: string; icon: typeof Table2 }[] = [
		{ value: 'matrix', label: 'Matrice', icon: LayoutGrid },
		{ value: 'table', label: 'Tableau', icon: Table2 },
		{ value: 'byVolunteer', label: 'Par bénévole', icon: Users }
	];

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
			<Input type="search" placeholder="Rechercher un bénévole…" bind:value={search} class="pl-9" />
		</div>

		<!-- Bascule de vue (desktop : la matrice prend tout l'écran ; sur mobile, vue empilée auto) -->
		<div class="hidden shrink-0 overflow-hidden rounded border border-border lg:flex">
			{#each views as v (v.value)}
				{@const Icon = v.icon}
				<button
					type="button"
					onclick={() => (view = v.value)}
					class="inline-flex min-h-8 items-center gap-1.5 px-3 text-sm font-medium transition duration-150 not-first:border-l not-first:border-border {view ===
					v.value
						? 'skin-glossy skin-primary text-white'
						: 'bg-surface text-ink-muted hover:bg-surface-muted'}"
				>
					<Icon size={15} />
					{v.label}
				</button>
			{/each}
		</div>

		<!-- Impression : menu déroulant (lève l'ambiguïté de l'ancien faux bouton « Imprimer ») -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded border border-border bg-surface px-3 text-sm font-medium text-ink-muted transition duration-150 hover:bg-surface-muted hover:text-ink"
			>
				<Printer size={15} /> Imprimer <ChevronDown size={14} />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					sideOffset={6}
					class="z-50 min-w-44 rounded-lg border border-border bg-surface p-1"
					style="box-shadow: var(--shadow-md)"
				>
					<DropdownMenu.Item
						onSelect={() => onPrint('poste')}
						class="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-ink outline-none data-highlighted:bg-surface-muted"
					>
						Planning par poste
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onSelect={() => onPrint('matrix')}
						class="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-ink outline-none data-highlighted:bg-surface-muted"
					>
						Matrice
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>

		<Button type="button" variant="ghost" size="sm" onclick={onExport} class="shrink-0">
			<FileSpreadsheet size={15} /> Excel
		</Button>
	</div>

	<!-- Filtres -->
	<div class="flex flex-wrap gap-2">
		<Select bind:value={positionFilter} options={positionOptions} class="flex-1" />
		<Select bind:value={dayFilter} options={dayFilterOptions} class="flex-1" />
		<Select bind:value={statusFilter} options={statusOptions} class="flex-1" />
	</div>
</div>
