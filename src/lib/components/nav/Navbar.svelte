<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';
	import { Shield, Trophy, CalendarRange } from 'lucide-svelte';
	import AccountMenu from './AccountMenu.svelte';

	type NavUser = { name?: string; email?: string; role: string } | null;
	let {
		user,
		viewMode
	}: { user: NavUser; viewMode: 'organizer' | 'volunteer' } = $props();

	const showOrgaNav = $derived(!!user && hasOrganizerAccess(user.role) && viewMode !== 'volunteer');
	const path = $derived(page.url.pathname);

	// Actif : correspondance exacte pour l'accueil, préfixe de segment sinon.
	const isActive = (href: string) =>
		href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
</script>

{#snippet navLink(href: string, label: string, Icon: typeof Trophy)}
	<a
		{href}
		aria-current={isActive(href) ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition
			{isActive(href)
			? 'bg-brand-primary/10 text-brand-primary'
			: 'text-ink-muted hover:bg-surface-subtle hover:text-ink'}"
	>
		<Icon size={16} class="shrink-0" />
		{label}
	</a>
{/snippet}

<header
	class="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm print:hidden"
>
	<div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
		<!-- Marque + liens principaux (desktop) -->
		<div class="flex items-center gap-1">
			<a
				href={resolve('/')}
				class="mr-2 whitespace-nowrap text-base font-bold tracking-tight text-brand-primary"
			>
				ACGB
			</a>
			<nav class="hidden items-center gap-0.5 lg:flex">
				{@render navLink(resolve('/tournois-publics'), 'Tournois', CalendarRange)}
				{#if showOrgaNav}
					{@render navLink(resolve('/tournois'), 'Mes tournois', Trophy)}
				{/if}
				{#if showOrgaNav && user && isSuperAdmin(user.role)}
					{@render navLink(resolve('/admin'), 'Admin', Shield)}
				{/if}
			</nav>
		</div>

		<!-- Compte / session (toutes tailles) -->
		<AccountMenu {user} {viewMode} {path} />
	</div>
</header>
