<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import { Mail } from 'lucide-svelte';

	let {
		volunteer,
		onclose
	}: { volunteer: { userId: string; name: string } | null; onclose: () => void } = $props();

	let email = $state('');
	let submitting = $state(false);

	const open = $derived(volunteer !== null);

	$effect(() => {
		if (open) email = '';
	});
</script>

<Modal {open} title="Ajouter un email" {onclose}>
	{#if volunteer}
		<p class="mt-1 text-sm text-ink-muted">
			Donner une adresse email à <strong class="text-ink-strong">{volunteer.name}</strong>.
		</p>
		<p class="mt-2 text-xs text-ink-muted">
			À sa première connexion avec cette adresse, ce bénévole retrouvera
			<strong>tous les créneaux déjà attribués</strong> et recevra ses rappels. Rien n'est perdu.
		</p>

		<form
			method="POST"
			action="?/attachEmail"
			class="mt-4 flex flex-col gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'success') {
						await invalidateAll();
						toast.success(`${volunteer.name} peut maintenant se connecter`);
						onclose();
					} else if (result.type === 'failure') {
						toast.error((result.data?.formError as string | undefined) ?? 'Action impossible.');
					}
				};
			}}
		>
			<input type="hidden" name="userId" value={volunteer.userId} />

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Email</span>
				<Input
					name="email"
					type="email"
					bind:value={email}
					placeholder="noelie@example.ch"
					required
				/>
			</label>

			<div class="mt-1 flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={onclose} disabled={submitting}>
					Annuler
				</Button>
				<Button type="submit" size="sm" disabled={submitting || email.trim() === ''}>
					<Mail size={15} />
					{submitting ? 'En cours…' : 'Enregistrer'}
				</Button>
			</div>
		</form>
	{/if}
</Modal>
