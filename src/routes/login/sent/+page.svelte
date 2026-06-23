<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Lien envoyé — Bénévoles ACGB</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">Vérifie ta boîte mail</h1>
<p class="mt-2 text-ink-muted">
	{#if data.email}
		On vient d'envoyer un lien de connexion à <span class="font-medium text-ink">{data.email}</span
		>.
	{:else}
		On vient de t'envoyer un lien de connexion par email.
	{/if}
	Clique dessus pour te connecter. Le lien est valable 15 minutes.
</p>

<p class="mt-6 text-sm text-ink-muted">
	Pas reçu ? Vérifie tes spams, ou
	<a class="font-medium text-brand-primary underline" href={resolve('/login')}
		>renvoie-toi un lien</a
	>.
</p>
