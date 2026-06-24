<script lang="ts">
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { confirmStore, resolveConfirm } from '$lib/confirm.svelte';

	const state = $derived(confirmStore.state);
</script>

{#if state}
	<Modal open={state.open} title={state.title} onclose={() => resolveConfirm(false)}>
		{#if state.message}
			<p class="text-sm text-ink-muted">{state.message}</p>
		{/if}
		<div class="mt-5 flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={() => resolveConfirm(false)}>
				{state.cancelLabel ?? 'Annuler'}
			</Button>
			<Button
				type="button"
				variant={state.variant === 'danger' ? 'danger' : 'primary'}
				size="sm"
				onclick={() => resolveConfirm(true)}
			>
				{state.confirmLabel ?? 'Confirmer'}
			</Button>
		</div>
	</Modal>
{/if}
