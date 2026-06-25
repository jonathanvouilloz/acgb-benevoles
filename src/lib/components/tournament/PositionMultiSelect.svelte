<script lang="ts">
	/**
	 * Sélecteur multiple de postes (déroulant à cases). Liste vide = « Tous les postes ».
	 * S'appuie sur le DropdownMenu de bits-ui (gère clic-extérieur, clavier, portail).
	 */
	import { DropdownMenu } from 'bits-ui';
	import { ChevronDown, Check } from 'lucide-svelte';

	let {
		positions,
		selected = $bindable([])
	}: {
		positions: { id: string; name: string; color: string }[];
		selected?: string[];
	} = $props();

	const label = $derived(
		selected.length === 0
			? 'Tous les postes'
			: selected.length === 1
				? (positions.find((p) => p.id === selected[0])?.name ?? '1 poste')
				: `${selected.length} postes`
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="inline-flex min-h-9 max-w-48 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors {selected.length >
		0
			? 'border-brand-primary bg-brand-primary text-white'
			: 'border-border text-ink hover:bg-surface-muted'}"
	>
		<span class="truncate">{label}</span>
		<ChevronDown size={14} class="shrink-0" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="end"
			sideOffset={6}
			class="z-50 max-h-72 min-w-52 overflow-y-auto rounded-lg border border-border bg-surface p-1"
			style="box-shadow: var(--shadow-md)"
		>
			<!-- Réinitialise vers « tous » -->
			<DropdownMenu.Item
				closeOnSelect={false}
				onSelect={() => (selected = [])}
				class="flex cursor-pointer items-center justify-between gap-2 rounded px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-muted {selected.length ===
				0
					? 'font-semibold text-brand-primary'
					: 'text-ink'}"
			>
				Tous les postes
				{#if selected.length === 0}<Check size={15} class="shrink-0" />{/if}
			</DropdownMenu.Item>
			<DropdownMenu.Separator class="my-1 h-px bg-border" />

			<DropdownMenu.CheckboxGroup bind:value={selected}>
				{#each positions as p (p.id)}
					<DropdownMenu.CheckboxItem
						value={p.id}
						closeOnSelect={false}
						class="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-ink outline-none data-highlighted:bg-surface-muted"
					>
						{#snippet children({ checked })}
							<span
								class="flex size-4 shrink-0 items-center justify-center rounded border {checked
									? 'border-brand-primary bg-brand-primary text-white'
									: 'border-border'}"
							>
								{#if checked}<Check size={12} />{/if}
							</span>
							<span class="size-2.5 shrink-0 rounded-full" style="background-color: {p.color}"></span>
							<span class="truncate">{p.name}</span>
						{/snippet}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.CheckboxGroup>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
