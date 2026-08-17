<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import type { CellRef } from './assignment-types';
	import { UserMinus, TriangleAlert } from 'lucide-svelte';

	let { cell, onclose }: { cell: CellRef | null; onclose: () => void } = $props();

	let reason = $state('');
	let submitting = $state(false);

	const open = $derived(cell !== null);

	$effect(() => {
		if (open) reason = '';
	});
</script>

<Modal {open} title="Retirer du créneau" {onclose}>
	{#if cell}
		<p class="mt-1 text-sm text-ink-muted">
			Retirer <strong class="text-ink-strong">{cell.name}</strong> de
			<strong class="text-ink-strong">{cell.positionName}</strong>
			· {cell.dayLabel}, {cell.timeLabel} ?
		</p>
		<p class="mt-2 text-xs text-ink-muted">
			La place redevient disponible et le bénévole est prévenu par notification s'il a activé l'app.
			L'opération est conservée dans l'historique du tournoi.
		</p>

		<form
			method="POST"
			action="?/remove"
			class="mt-4 flex flex-col gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'success') {
						await invalidateAll();
						const d = result.data as { notified?: boolean; volunteerName?: string } | undefined;
						const who = d?.volunteerName ?? cell.name;
						// Un retrait silencieux est un piège : si personne n'a été prévenu, on le dit.
						if (d?.notified) {
							toast.success(`${who} a été retiré·e et prévenu·e`);
						} else {
							toast.success(`${who} a été retiré·e — non prévenu·e, appelez-le·la`);
						}
						onclose();
					} else if (result.type === 'failure') {
						toast.error((result.data?.formError as string | undefined) ?? 'Action impossible.');
						onclose();
					}
				};
			}}
		>
			<input type="hidden" name="shiftId" value={cell.shiftId} />
			<input type="hidden" name="userId" value={cell.userId} />

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">
					Motif <span class="font-normal text-ink-muted">(facultatif)</span>
				</span>
				<Input
					name="reason"
					bind:value={reason}
					placeholder="a annulé, remplacé·e par…"
					maxlength={280}
				/>
			</label>

			<p
				class="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink"
			>
				<TriangleAlert size={14} class="mt-0.5 shrink-0 text-warning" />
				<span
					>Un bénévole ajouté par un organisateur sans email ne recevra aucune notification.</span
				>
			</p>

			<div class="mt-1 flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={onclose} disabled={submitting}>
					Annuler
				</Button>
				<Button type="submit" variant="danger" size="sm" disabled={submitting}>
					<UserMinus size={15} />
					{submitting ? 'En cours…' : 'Retirer'}
				</Button>
			</div>
		</form>
	{/if}
</Modal>
