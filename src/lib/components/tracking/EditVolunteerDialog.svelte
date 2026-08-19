<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import { Check } from 'lucide-svelte';

	/**
	 * Corriger la fiche d'un bénévole créé par l'organisateur (Epic 15) — né d'une faute de frappe
	 * sur un nom, jusqu'ici définitive.
	 *
	 * Ne s'ouvre que sur une fiche dont `isEditable` est vrai (créée par cet organisateur) : on ne
	 * réécrit jamais le profil de quelqu'un qui gère son propre compte.
	 */
	let {
		volunteer,
		onclose
	}: {
		volunteer: {
			userId: string;
			name: string;
			phone: string | null;
			/** Fiche encore sans email réel : l'ajouter la rend connectable, d'où l'encart. */
			isManaged: boolean;
		} | null;
		onclose: () => void;
	} = $props();

	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let submitting = $state(false);

	const open = $derived(volunteer !== null);

	// Réinitialise les champs sur la fiche courante à chaque ouverture.
	$effect(() => {
		if (volunteer) {
			name = volunteer.name;
			phone = volunteer.phone ?? '';
			email = '';
		}
	});
</script>

<Modal {open} title="Modifier la fiche" {onclose}>
	{#if volunteer}
		<p class="mt-1 text-sm text-ink-muted">
			Fiche créée par toi : tu peux corriger ces informations.
		</p>

		<form
			method="POST"
			action="?/updateVolunteer"
			class="mt-4 flex flex-col gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'success') {
						await invalidateAll();
						toast.success('Fiche mise à jour');
						onclose();
					} else if (result.type === 'failure') {
						toast.error((result.data?.formError as string | undefined) ?? 'Action impossible.');
					}
				};
			}}
		>
			<input type="hidden" name="userId" value={volunteer.userId} />

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Nom</span>
				<Input name="name" bind:value={name} required />
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Téléphone</span>
				<Input name="phone" type="tel" bind:value={phone} placeholder="079 123 45 67" />
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">
					Email {#if volunteer.isManaged}<span class="font-normal text-ink-muted">(optionnel)</span
						>{:else}<span class="font-normal text-ink-muted"
							>(laisser vide pour ne pas changer)</span
						>{/if}
				</span>
				<Input name="email" type="email" bind:value={email} placeholder="noelie@example.ch" />
			</label>

			{#if volunteer.isManaged}
				<p class="text-xs text-ink-muted">
					À sa première connexion avec cette adresse, ce bénévole retrouvera
					<strong>tous les créneaux déjà attribués</strong> et recevra ses rappels. Rien n'est perdu.
				</p>
			{/if}

			<div class="mt-1 flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onclick={onclose} disabled={submitting}>
					Annuler
				</Button>
				<Button type="submit" size="sm" disabled={submitting || name.trim() === ''}>
					<Check size={15} />
					{submitting ? 'En cours…' : 'Enregistrer'}
				</Button>
			</div>
		</form>
	{/if}
</Modal>
