<script lang="ts">
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import ShiftFields from './ShiftFields.svelte';
	import { slideDuration } from '$lib/motion';
	import { confirmAction } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatDay, formatTimeRange, toDateInputValue, toTimeInputValue } from '$lib/format';
	import { Pencil, Trash2, Check, X } from 'lucide-svelte';
	import type { Shift, Tournament } from '$lib/server/db/schema';

	let {
		shift,
		tournament,
		form
	}: {
		shift: Shift;
		tournament: Pick<Tournament, 'startDate' | 'endDate'>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	let editing = $state(false);

	const errors = $derived(
		form?.action === 'updateShift' && form?.shiftId === shift.id ? form.errors : undefined
	);
</script>

{#if editing}
	<form
		method="POST"
		action="?/updateShift"
		class="flex flex-col gap-2 rounded border border-border bg-surface-subtle p-2"
		transition:slide={{ duration: slideDuration }}
		use:enhance={() =>
			async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					editing = false;
					toast.success('Créneau modifié');
				}
			}}
	>
		<input type="hidden" name="shiftId" value={shift.id} />
		<div class="flex flex-wrap items-end gap-2">
			<ShiftFields
				{tournament}
				day={toDateInputValue(shift.startsAt)}
				startTime={toTimeInputValue(shift.startsAt)}
				endTime={toTimeInputValue(shift.endsAt)}
				capacity={String(shift.capacity)}
			/>
			<div class="flex gap-1">
				<button
					type="submit"
					title="Enregistrer"
					class="skin-glossy skin-primary inline-flex min-h-9 items-center rounded px-2 text-white"
				>
					<Check size={16} />
				</button>
				<button
					type="button"
					title="Annuler"
					onclick={() => (editing = false)}
					class="inline-flex min-h-9 items-center rounded px-2 text-ink-muted hover:bg-surface-muted"
				>
					<X size={16} />
				</button>
			</div>
		</div>
		{#if errors}
			<p class="text-xs text-error">
				{errors.day?.[0] ?? errors.startTime?.[0] ?? errors.endTime?.[0] ?? errors.capacity?.[0]}
			</p>
		{/if}
	</form>
{:else}
	<div class="flex items-center justify-between gap-2 rounded px-1 py-1.5">
		<div class="text-sm text-ink">
			<span class="font-medium text-ink-strong">{formatDay(shift.startsAt)}</span>
			· {formatTimeRange(shift.startsAt, shift.endsAt)}
			<span class="text-ink-muted">· {shift.capacity} place{shift.capacity > 1 ? 's' : ''}</span>
		</div>
		<div class="flex shrink-0 gap-0.5">
			<button
				type="button"
				title="Modifier le créneau"
				onclick={() => (editing = true)}
				class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
			>
				<Pencil size={15} />
			</button>
			<form
				method="POST"
				action="?/deleteShift"
				use:enhance={() =>
					async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') toast.success('Créneau supprimé');
					}}
			>
				<input type="hidden" name="shiftId" value={shift.id} />
				<button
					type="submit"
					title="Supprimer le créneau"
					onclick={async (e) => {
						e.preventDefault();
						const f = e.currentTarget.form;
						const ok = await confirmAction({
							title: 'Supprimer le créneau',
							message: 'Ce créneau et les inscriptions associées seront supprimés.',
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
	</div>
{/if}
