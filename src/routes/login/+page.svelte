<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);

	// Email inconnu en mode connexion → on bascule sur la création de compte (email pré-rempli).
	// svelte-ignore state_referenced_locally
	let mode = $state<'login' | 'signup'>(form?.notFound ? 'signup' : (form?.mode ?? 'login'));

	const expired = $derived(page.url.searchParams.get('error') === 'expired');
	const inputClass =
		'min-h-8 rounded border border-surface-border px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary';
</script>

<svelte:head><title>Connexion — Bénévoles ACGB</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">
	{mode === 'login' ? 'Connexion' : 'Créer un compte'}
</h1>
<p class="mt-2 text-ink-muted">
	{#if data.prototype}
		Mode démo : entre tes infos, tu es connecté immédiatement (aucun email envoyé).
	{:else if mode === 'login'}
		Entre ton email : on t'envoie un lien de connexion, sans mot de passe.
	{:else}
		Première fois ? On crée ton compte et on t'envoie un lien de connexion par email.
	{/if}
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
	<input type="hidden" name="redirect" value={data.redirect ?? ''} />
	<input type="hidden" name="mode" value={mode} />

	{#if mode === 'signup'}
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Prénom
			<input
				name="prenom"
				type="text"
				autocomplete="given-name"
				value={form?.values?.prenom ?? ''}
				class={inputClass}
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
				class={inputClass}
			/>
			{#if form?.errors?.nom}<span class="text-xs text-error">{form.errors.nom[0]}</span>{/if}
		</label>
	{/if}

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Email
		<input
			name="email"
			type="email"
			autocomplete="email"
			inputmode="email"
			value={form?.values?.email ?? ''}
			class={inputClass}
		/>
		{#if form?.errors?.email}<span class="text-xs text-error">{form.errors.email[0]}</span>{/if}
	</label>

	{#if mode === 'signup'}
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Téléphone
			<input
				name="phone"
				type="tel"
				autocomplete="tel"
				inputmode="tel"
				placeholder="+41 79 123 45 67"
				value={form?.values?.phone ?? ''}
				class={inputClass}
			/>
			{#if form?.errors?.phone}<span class="text-xs text-error">{form.errors.phone[0]}</span>{/if}
		</label>
	{/if}

	<Button type="submit" size="sm" disabled={submitting} class="mt-2">
		{#if submitting}
			{data.prototype ? 'Connexion…' : 'Envoi…'}
		{:else if data.prototype}
			{mode === 'login' ? 'Se connecter' : 'Créer mon compte et entrer'}
		{:else}
			{mode === 'login' ? 'Recevoir mon lien' : 'Créer mon compte'}
		{/if}
	</Button>
</form>

<p class="mt-6 text-sm text-ink-muted">
	{#if mode === 'login'}
		Pas encore de compte ?
		<button
			type="button"
			onclick={() => (mode = 'signup')}
			class="font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-700"
		>
			Créer un compte
		</button>
	{:else}
		Tu as déjà un compte ?
		<button
			type="button"
			onclick={() => (mode = 'login')}
			class="font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-700"
		>
			Se connecter
		</button>
	{/if}
</p>
