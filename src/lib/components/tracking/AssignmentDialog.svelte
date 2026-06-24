<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { toast } from '$lib/toast.svelte';
	import { ArrowLeftRight, ArrowRight } from 'lucide-svelte';
	import type { AssignRequest } from './assignment-types';

	let { request, onclose }: { request: AssignRequest | null; onclose: () => void } = $props();

	let submitting = $state(false);

	const open = $derived(request !== null);
	const isSwap = $derived(request?.type === 'swap');
</script>

<Modal {open} title={isSwap ? 'Échanger deux bénévoles' : 'Déplacer un bénévole'} {onclose}>
	{#if request}
		{#if request.type === 'swap'}
			<p class="text-sm text-ink-muted">Les deux bénévoles échangent leur créneau :</p>
			<div class="mt-3 flex items-center gap-3">
				<div class="flex-1 rounded-md border border-border bg-surface-subtle p-3 text-sm">
					<p class="font-semibold text-ink-strong">{request.a.name}</p>
					<p class="text-ink-muted">{request.a.positionName}</p>
					<p class="text-ink-muted">{request.a.dayLabel} · {request.a.timeLabel}</p>
				</div>
				<ArrowLeftRight size={20} class="shrink-0 text-brand-primary" />
				<div class="flex-1 rounded-md border border-border bg-surface-subtle p-3 text-sm">
					<p class="font-semibold text-ink-strong">{request.b.name}</p>
					<p class="text-ink-muted">{request.b.positionName}</p>
					<p class="text-ink-muted">{request.b.dayLabel} · {request.b.timeLabel}</p>
				</div>
			</div>
		{:else}
			<p class="text-sm text-ink-muted">Déplacer ce bénévole vers un autre créneau :</p>
			<div class="mt-3 flex items-center gap-3">
				<div class="flex-1 rounded-md border border-border bg-surface-subtle p-3 text-sm">
					<p class="font-semibold text-ink-strong">{request.from.name}</p>
					<p class="text-ink-muted">{request.from.positionName}</p>
					<p class="text-ink-muted">{request.from.dayLabel} · {request.from.timeLabel}</p>
				</div>
				<ArrowRight size={20} class="shrink-0 text-brand-primary" />
				<div
					class="flex-1 rounded-md border border-brand-primary/40 bg-brand-primary/5 p-3 text-sm"
				>
					<p class="text-ink-muted">vers</p>
					<p class="font-semibold text-ink-strong">{request.target.positionName}</p>
					<p class="text-ink-muted">{request.target.dayLabel} · {request.target.timeLabel}</p>
				</div>
			</div>
		{/if}

		<form
			method="POST"
			action={request.type === 'swap' ? '?/swap' : '?/move'}
			class="mt-5 flex justify-end gap-2"
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'success') {
						await invalidateAll();
						toast.success(isSwap ? 'Bénévoles échangés' : 'Bénévole déplacé');
						onclose();
					} else if (result.type === 'failure') {
						toast.error((result.data?.formError as string | undefined) ?? 'Action impossible.');
						onclose();
					}
				};
			}}
		>
			{#if request.type === 'swap'}
				<input type="hidden" name="aShiftId" value={request.a.shiftId} />
				<input type="hidden" name="aUserId" value={request.a.userId} />
				<input type="hidden" name="bShiftId" value={request.b.shiftId} />
				<input type="hidden" name="bUserId" value={request.b.userId} />
			{:else}
				<input type="hidden" name="shiftId" value={request.from.shiftId} />
				<input type="hidden" name="userId" value={request.from.userId} />
				<input type="hidden" name="targetShiftId" value={request.target.shiftId} />
			{/if}

			<Button type="button" variant="ghost" size="sm" onclick={onclose} disabled={submitting}>
				Annuler
			</Button>
			<Button type="submit" size="sm" disabled={submitting}>
				{submitting ? 'En cours…' : isSwap ? 'Échanger' : 'Déplacer'}
			</Button>
		</form>
	{/if}
</Modal>
