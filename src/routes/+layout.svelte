<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/manrope';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	let signingOut = $state(false);

	async function logout() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		signingOut = false;
		await goto(resolve('/login'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="mx-auto min-h-dvh w-full max-w-[640px] px-4 py-6">
	<header class="mb-6 flex items-center justify-between gap-3">
		<a href={resolve('/')} class="text-sm font-semibold text-brand-primary">Bénévoles ACGB</a>
		{#if data.user}
			<div class="flex items-center gap-3 text-sm">
				{#if data.user.isOrganizer}
					<a href={resolve('/tournois')} class="font-medium text-brand-primary hover:underline"
						>Mes tournois</a
					>
				{/if}
				<span class="text-ink-muted">{data.user.name}</span>
				<button
					type="button"
					onclick={logout}
					disabled={signingOut}
					class="font-medium text-ink-muted underline hover:text-ink disabled:opacity-50"
				>
					Déconnexion
				</button>
			</div>
		{:else}
			<a href={resolve('/login')} class="text-sm font-medium text-brand-primary underline"
				>Connexion</a
			>
		{/if}
	</header>

	{@render children()}
</div>
