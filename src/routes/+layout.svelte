<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/manrope';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/toast';
	import { ConfirmDialog } from '$lib/components/ui/confirm';
	import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';
	import { LogOut, User, Shield } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	/** Le suivi organisateur (matrice récap) exploite toute la largeur écran ; le reste reste étroit.
	    La page centre elle-même son chrome (en-tête/synthèse/toolbar), seule la matrice déborde. */
	const wide = $derived(page.url.pathname.endsWith('/suivi'));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="mx-auto min-h-dvh w-full px-4 py-6 print:p-0">
	<!-- Chrome (bandeau + navbar) : contraint même quand la page déborde (/suivi) → la navbar
	     reste alignée avec le contenu et ne s'étire pas en pleine largeur. -->
	<div class="mx-auto w-full {wide ? 'max-w-5xl' : 'max-w-[640px]'}">
		{#if data.prototype}
			<p
				class="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-center text-xs font-medium text-ink-muted print:hidden"
			>
				Mode démo — connexion sans email, données de test
			</p>
		{/if}

		<header class="mb-6 flex items-center justify-between gap-3 print:hidden">
			<a href={resolve('/')} class="text-sm font-semibold text-brand-primary">Bénévoles ACGB</a>
			{#if data.user}
				<div class="flex items-center gap-3 text-sm">
					{#if isSuperAdmin(data.user.role)}
						<a
							href={resolve('/admin')}
							class="flex items-center gap-1 font-medium text-brand-primary hover:underline"
						>
							<Shield size={15} class="shrink-0" /> Admin
						</a>
					{/if}
					{#if hasOrganizerAccess(data.user.role)}
						<a href={resolve('/tournois')} class="font-medium text-brand-primary hover:underline"
							>Mes tournois</a
						>
					{/if}
					<a
						href={resolve('/compte')}
						class="flex items-center gap-1 font-medium text-brand-primary hover:underline"
					>
						<User size={15} class="shrink-0" /> Mon compte
					</a>
					<form method="POST" action={resolve('/logout')} class="flex">
						<button
							type="submit"
							aria-label="Déconnexion"
							title="Déconnexion"
							class="flex items-center text-ink-muted hover:text-ink"
						>
							<LogOut size={16} class="shrink-0" />
						</button>
					</form>
				</div>
			{:else}
				<a href={resolve('/login')} class="text-sm font-medium text-brand-primary underline"
					>Connexion</a
				>
			{/if}
		</header>
	</div>

	<!-- Contenu : ~90vw sur /suivi (matrice large mais avec un peu d'air), contraint ailleurs. -->
	<div class="mx-auto w-full {wide ? 'max-w-[90vw]' : 'max-w-[640px]'}">
		{@render children()}
	</div>
</div>

<!-- Singletons globaux : feedback transitoire + confirmations -->
<div class="print:hidden">
	<Toaster />
	<ConfirmDialog />
</div>
