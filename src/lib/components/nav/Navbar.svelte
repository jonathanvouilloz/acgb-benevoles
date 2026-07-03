<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';
	import { isActive, type AgendaItem } from '$lib/nav-model';
	import { Shield, Trophy, CalendarRange } from 'lucide-svelte';
	import AccountMenu from './AccountMenu.svelte';
	import NotificationBell from './NotificationBell.svelte';
	import logoAcgb from '$lib/assets/logo-acgb.png';

	type NavUser = { name?: string; email?: string; role: string } | null;
	let {
		user,
		viewMode,
		upcomingShifts = [],
		imminentCount = 0
	}: {
		user: NavUser;
		viewMode: 'organizer' | 'volunteer';
		upcomingShifts?: AgendaItem[];
		imminentCount?: number;
	} = $props();

	const showOrgaNav = $derived(!!user && hasOrganizerAccess(user.role) && viewMode !== 'volunteer');
	const path = $derived(page.url.pathname);
</script>

{#snippet navLink(href: string, label: string, Icon: typeof Trophy)}
	<a
		{href}
		aria-current={isActive(path, href) ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition
			{isActive(path, href)
			? 'bg-brand-primary/10 text-brand-primary'
			: 'text-ink-muted hover:bg-surface-subtle hover:text-ink'}"
	>
		<Icon size={16} class="shrink-0" />
		{label}
	</a>
{/snippet}

<header class="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm print:hidden">
	<div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
		<!-- Marque + liens principaux (desktop) -->
		<div class="flex items-center gap-2">
			<a href={resolve('/')} class="mr-1 flex shrink-0 items-center" aria-label="Accueil ACGB">
				<img src={logoAcgb} alt="ACGB" class="h-7 w-auto" />
			</a>
			<nav class="hidden items-center gap-1 lg:flex">
				{@render navLink(resolve('/tournois-publics'), 'Tournois', CalendarRange)}
				{#if showOrgaNav}
					{@render navLink(resolve('/tournois'), 'Mes tournois', Trophy)}
				{/if}
				{#if showOrgaNav && user && isSuperAdmin(user.role)}
					{@render navLink(resolve('/admin'), 'Admin', Shield)}
				{/if}
			</nav>
		</div>

		<!-- Notifications + compte / session -->
		<div class="flex items-center gap-2">
			{#if user}
				<NotificationBell {upcomingShifts} {imminentCount} {path} />
			{/if}
			<AccountMenu {user} {viewMode} {path} />
		</div>
	</div>
</header>
