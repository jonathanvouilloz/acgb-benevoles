<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/manrope';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { Toaster } from '$lib/components/ui/toast';
	import { ConfirmDialog } from '$lib/components/ui/confirm';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	let signingOut = $state(false);

	/** Le suivi organisateur (tableau récap) a besoin de toute la largeur ; le reste reste étroit. */
	const wide = $derived(page.url.pathname.endsWith('/suivi'));

	async function logout() {
		signingOut = true;
		await authClient.signOut();
		await invalidateAll();
		signingOut = false;
		await goto(resolve('/login'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="mx-auto min-h-dvh w-full px-4 py-6 {wide ? 'max-w-6xl' : 'max-w-[640px]'}">
	{#if data.prototype}
		<p
			class="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-center text-xs font-medium text-ink-muted"
		>
			Mode démo — connexion sans email, données de test
		</p>
	{/if}

	<header class="mb-6 flex items-center justify-between gap-3">
		<a href={resolve('/')} class="text-sm font-semibold text-brand-primary">Bénévoles ACGB</a>
		{#if data.user}
			<div class="flex items-center gap-3 text-sm">
				{#if data.user.isOrganizer}
					<a href={resolve('/tournois')} class="font-medium text-brand-primary hover:underline"
						>Mes tournois</a
					>
				{/if}
				<a
					href={resolve('/compte')}
					class="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
					>{data.user.name}</a
				>
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

<!-- Singletons globaux : feedback transitoire + confirmations -->
<Toaster />
<ConfirmDialog />
