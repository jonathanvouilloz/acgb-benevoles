<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import TournamentDateFields from '$lib/components/tournament/TournamentDateFields.svelte';
	import { toast } from '$lib/toast.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);
</script>

<svelte:head><title>Nouveau tournoi — Bénévoles ACGB</title></svelte:head>

<a
	href={resolve('/tournois')}
	class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
>
	<ArrowLeft size={16} /> Mes tournois
</a>

<h1 class="mt-3 h1">Nouveau tournoi</h1>

<form
	method="POST"
	class="mt-6 flex flex-col gap-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update, result }) => {
			if (result.type === 'redirect') toast.success('Tournoi créé');
			await update();
			submitting = false;
		};
	}}
>
	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Nom du tournoi
		<Input
			name="name"
			type="text"
			value={form?.values?.name ?? ''}
			placeholder="Tournoi de printemps"
		/>
		{#if form?.errors?.name}<span class="text-xs text-error">{form.errors.name[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Lieu <span class="font-normal text-ink-muted">(optionnel)</span>
		<Input
			name="location"
			type="text"
			value={form?.values?.location ?? ''}
			placeholder="Centre sportif du Bois-des-Frères"
		/>
		{#if form?.errors?.location}<span class="text-xs text-error">{form.errors.location[0]}</span
			>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Consignes aux bénévoles <span class="font-normal text-ink-muted">(optionnel)</span>
		<textarea
			name="instructions"
			rows="4"
			maxlength="2000"
			value={form?.values?.instructions ?? ''}
			placeholder="Minimum 6 h par bénévole · précisez vos contraintes dans le commentaire"
			class="resize-y rounded-md border border-surface-border bg-surface px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
		></textarea>
		<span class="text-xs font-normal text-ink-muted">
			Affiché en tête de la page d'inscription, avant les créneaux.
		</span>
		{#if form?.errors?.instructions}<span class="text-xs text-error"
				>{form.errors.instructions[0]}</span
			>{/if}
	</label>

	<TournamentDateFields
		start={form?.values?.startDate ?? ''}
		end={form?.values?.endDate ?? ''}
		errors={form?.errors}
	/>

	<Button type="submit" size="sm" disabled={submitting} class="mt-2">
		{submitting ? 'Création…' : 'Créer le tournoi'}
	</Button>
</form>
