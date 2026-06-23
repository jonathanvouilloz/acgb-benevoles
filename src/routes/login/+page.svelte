<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);

	const expired = $derived(page.url.searchParams.get('error') === 'expired');
</script>

<svelte:head><title>Connexion — Bénévoles ACGB</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">Connexion</h1>
<p class="mt-2 text-ink-muted">
	Entre tes informations : on t'envoie un lien de connexion par email, sans mot de passe.
</p>

{#if expired}
	<p class="mt-4 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
		Ton lien a expiré ou a déjà été utilisé. Renvoie-toi un nouveau lien ci-dessous.
	</p>
{/if}

{#if form?.formError}
	<p class="mt-4 rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-ink">
		{form.formError}
	</p>
{/if}

<form
	method="POST"
	class="mt-6 flex flex-col gap-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Prénom
		<input
			name="prenom"
			type="text"
			autocomplete="given-name"
			value={form?.values?.prenom ?? ''}
			class="min-h-11 rounded border border-surface-border px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
		/>
		{#if form?.errors?.prenom}<span class="text-xs text-error">{form.errors.prenom[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Nom
		<input
			name="nom"
			type="text"
			autocomplete="family-name"
			value={form?.values?.nom ?? ''}
			class="min-h-11 rounded border border-surface-border px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
		/>
		{#if form?.errors?.nom}<span class="text-xs text-error">{form.errors.nom[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Email
		<input
			name="email"
			type="email"
			autocomplete="email"
			inputmode="email"
			value={form?.values?.email ?? ''}
			class="min-h-11 rounded border border-surface-border px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
		/>
		{#if form?.errors?.email}<span class="text-xs text-error">{form.errors.email[0]}</span>{/if}
	</label>

	<Button type="submit" disabled={submitting} class="mt-2">
		{submitting ? 'Envoi…' : 'Recevoir mon lien'}
	</Button>
</form>
