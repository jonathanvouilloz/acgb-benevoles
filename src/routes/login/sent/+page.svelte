<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);

	// Renvoi : on revient sur /login avec l'email pré-rempli et la cible conservée.
	const resendQuery = $derived(
		[
			data.email && `email=${encodeURIComponent(data.email)}`,
			data.redirect && `redirect=${encodeURIComponent(data.redirect)}`
		]
			.filter(Boolean)
			.join('&')
	);
</script>

<svelte:head><title>Lien envoyé — Bénévoles ACGB</title></svelte:head>

<h1 class="h1">Vérifie ta boîte mail</h1>
<p class="mt-2 text-ink-muted">
	{#if data.email}
		On vient d'envoyer un lien de connexion à <span class="font-medium text-ink">{data.email}</span
		>.
	{:else}
		On vient de t'envoyer un lien de connexion par email.
	{/if}
	Clique dessus pour te connecter, ou tape ici le code à 6 chiffres du mail. Valable 15 minutes.
</p>

{#if data.email}
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
		<input type="hidden" name="email" value={data.email} />
		<input type="hidden" name="redirect" value={data.redirect ?? ''} />
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Code reçu par email
			<input
				name="code"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				pattern="[0-9 ]*"
				maxlength="7"
				placeholder="123456"
				class="min-h-8 w-40 rounded border border-surface-border px-3 text-sm tracking-widest text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
			/>
			{#if form?.codeError}<span class="text-xs text-error">{form.codeError}</span>{/if}
		</label>
		<Button type="submit" size="sm" disabled={submitting} class="self-start">
			{submitting ? 'Connexion…' : 'Me connecter'}
		</Button>
	</form>
{/if}

<p class="mt-6 text-sm text-ink-muted">
	Pas reçu ? Vérifie tes spams, ou
	<a class="font-medium text-brand-primary underline" href="{resolve('/login')}?{resendQuery}"
		>renvoie-toi un lien</a
	>.
</p>
