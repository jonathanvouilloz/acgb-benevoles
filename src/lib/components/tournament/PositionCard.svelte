<script lang="ts">
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { slideDuration } from '$lib/motion';
	import { confirmAction } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import ShiftRow from './ShiftRow.svelte';
	import ShiftFields from './ShiftFields.svelte';
	import { Pencil, Trash2, Plus, Check, X, ChevronRight } from 'lucide-svelte';
	import type { Position, Shift, Tournament } from '$lib/server/db/schema';

	let {
		position,
		tournament,
		form,
		collapsed,
		onToggleCollapse
	}: {
		position: Position & { shifts: Shift[] };
		tournament: Pick<Tournament, 'startDate' | 'endDate'>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
		collapsed: boolean;
		onToggleCollapse: () => void;
	} = $props();

	let editing = $state(false);

	const renameErrors = $derived(
		form?.action === 'updatePosition' && form?.positionId === position.id ? form.errors : undefined
	);
	const shiftErrors = $derived(
		form?.action === 'createShift' && form?.positionId === position.id ? form.errors : undefined
	);
</script>

<section class="rounded-lg border border-border bg-surface">
	<!-- En-tête poste -->
	<header class="flex items-start justify-between gap-2 border-b border-border p-3">
		{#if editing}
			<form
				method="POST"
				action="?/updatePosition"
				class="flex flex-1 flex-col gap-2"
				transition:slide={{ duration: slideDuration }}
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							editing = false;
							toast.success('Poste modifié');
						}
					}}
			>
				<input type="hidden" name="positionId" value={position.id} />
				<Input name="name" type="text" value={position.name} />
				<Input
					name="description"
					type="text"
					value={position.description ?? ''}
					placeholder="Description (optionnel)"
					class="text-sm"
				/>
				{#if renameErrors}
					<p class="text-xs text-error">
						{renameErrors.name?.[0] ?? renameErrors.description?.[0]}
					</p>
				{/if}
				<div class="flex gap-1">
					<button
						type="submit"
						title="Enregistrer"
						class="skin-glossy skin-primary inline-flex min-h-9 items-center gap-1 rounded px-2 text-sm text-white"
					>
						<Check size={16} /> Enregistrer
					</button>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="inline-flex min-h-9 items-center rounded px-2 text-ink-muted hover:bg-surface-muted"
					>
						<X size={16} />
					</button>
				</div>
			</form>
		{:else}
			<button
				type="button"
				onclick={onToggleCollapse}
				aria-expanded={!collapsed}
				class="flex min-w-0 flex-1 items-center gap-2 text-left"
			>
				<ChevronRight
					size={16}
					class="shrink-0 text-ink-muted transition-transform duration-[var(--dur-fast)] {collapsed
						? ''
						: 'rotate-90'}"
				/>
				<span class="size-3.5 shrink-0 rounded-full" style="background-color: {position.color}"
				></span>
				<div class="min-w-0">
					<h3 class="truncate h3">
						{position.name}
						<span class="font-normal text-ink-muted">({position.shifts.length})</span>
					</h3>
					{#if position.description}
						<p class="truncate text-sm text-ink-muted">{position.description}</p>
					{/if}
				</div>
			</button>
			<div class="flex shrink-0 gap-0.5">
				<button
					type="button"
					title="Modifier le poste"
					onclick={() => (editing = true)}
					class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
				>
					<Pencil size={15} />
				</button>
				<form
					method="POST"
					action="?/deletePosition"
					use:enhance={() =>
						async ({ update, result }) => {
							await update({ reset: false });
							if (result.type === 'success') toast.success('Poste supprimé');
						}}
				>
					<input type="hidden" name="positionId" value={position.id} />
					<button
						type="submit"
						title="Supprimer le poste"
						onclick={async (e) => {
							e.preventDefault();
							const f = e.currentTarget.form;
							const ok = await confirmAction({
								title: 'Supprimer le poste',
								message: `Le poste « ${position.name} » et tous ses créneaux seront supprimés.`,
								confirmLabel: 'Supprimer',
								variant: 'danger'
							});
							if (ok) f?.requestSubmit();
						}}
						class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-error/10 hover:text-error"
					>
						<Trash2 size={15} />
					</button>
				</form>
			</div>
		{/if}
	</header>

	<!-- Créneaux -->
	{#if !collapsed}
		<div class="flex flex-col gap-1 p-3" transition:slide={{ duration: slideDuration }}>
			{#if position.shifts.length === 0}
				<p class="text-sm text-ink-muted">Aucun créneau. Ajoute le premier ci-dessous.</p>
			{:else}
				{#each position.shifts as shift (shift.id)}
					<ShiftRow {shift} {tournament} {form} />
				{/each}
			{/if}

			<!-- Ajout de créneau -->
			<form
				method="POST"
				action="?/createShift"
				class="mt-2 flex flex-wrap items-end gap-2 border-t border-border pt-3"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') toast.success('Créneau ajouté');
					}}
			>
				<input type="hidden" name="positionId" value={position.id} />
				<ShiftFields {tournament} />
				<Button type="submit" variant="secondary" size="sm">
					<Plus size={16} /> Créneau
				</Button>
				{#if shiftErrors}
					<p class="w-full text-xs text-error">
						{shiftErrors.day?.[0] ??
							shiftErrors.startTime?.[0] ??
							shiftErrors.endTime?.[0] ??
							shiftErrors.capacity?.[0]}
					</p>
				{/if}
			</form>
		</div>
	{/if}
</section>
