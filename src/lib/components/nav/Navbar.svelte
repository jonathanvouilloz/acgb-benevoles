<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { hasOrganizerAccess, isSuperAdmin, roleLabel } from '$lib/roles';
	import { LogOut, User, Shield, Eye, Menu, X, Trophy, CalendarRange } from 'lucide-svelte';

	type NavUser = { role: string } | null;
	let {
		user,
		viewMode
	}: { user: NavUser; viewMode: 'organizer' | 'volunteer' } = $props();

	let open = $state(false);

	const canSwitchView = $derived(!!user && hasOrganizerAccess(user.role));
	const volunteerView = $derived(viewMode === 'volunteer');
	const showOrgaNav = $derived(canSwitchView && !volunteerView);
	const path = $derived(page.url.pathname);

	// Ferme le menu mobile à chaque navigation.
	$effect(() => {
		void path;
		open = false;
	});

	const isActive = (href: string) =>
		href === '/' ? path === '/' : path.startsWith(href);
</script>

{#snippet navLink(href: string, label: string, Icon: typeof Trophy)}
	<a
		{href}
		class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition
			{isActive(href)
			? 'bg-brand-primary/10 text-brand-primary'
			: 'text-ink-muted hover:bg-surface-subtle hover:text-ink'}"
	>
		<Icon size={16} class="shrink-0" />
		{label}
	</a>
{/snippet}

{#snippet viewToggle(compact: boolean)}
	<form method="POST" action={resolve('/set-view')} class="flex {compact ? 'w-full' : ''}">
		<input type="hidden" name="mode" value={volunteerView ? 'organizer' : 'volunteer'} />
		<input type="hidden" name="redirect" value={path} />
		<button
			type="submit"
			class="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-brand-primary hover:text-brand-primary
				{compact ? 'w-full justify-center' : ''}"
			title={volunteerView ? 'Revenir en vue organisateur' : 'Voir en tant que bénévole'}
		>
			<Eye size={14} class="shrink-0" />
			{volunteerView ? 'Revenir en organisateur' : 'Voir en bénévole'}
		</button>
	</form>
{/snippet}

<header
	class="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm print:hidden"
>
	<div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
		<!-- Brand + liens principaux (desktop) -->
		<div class="flex items-center gap-1">
			<a
				href={resolve('/')}
				class="mr-2 whitespace-nowrap text-sm font-semibold text-brand-primary"
			>
				Bénévoles ACGB
			</a>
			<nav class="hidden items-center gap-0.5 md:flex">
				{@render navLink(resolve('/tournois-publics'), 'Tournois', CalendarRange)}
				{#if showOrgaNav}
					{@render navLink(resolve('/tournois'), 'Mes tournois', Trophy)}
				{/if}
				{#if showOrgaNav && user && isSuperAdmin(user.role)}
					{@render navLink(resolve('/admin'), 'Admin', Shield)}
				{/if}
			</nav>
		</div>

		<!-- Actions (desktop) -->
		<div class="hidden items-center gap-2 md:flex">
			{#if user}
				{#if canSwitchView}
					{@render viewToggle(false)}
				{:else}
					<span
						class="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary"
					>
						{roleLabel(user.role)}
					</span>
				{/if}
				{@render navLink(resolve('/compte'), 'Mon compte', User)}
				<form method="POST" action={resolve('/logout')} class="flex">
					<button
						type="submit"
						aria-label="Déconnexion"
						title="Déconnexion"
						class="flex items-center rounded-md p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
					>
						<LogOut size={18} class="shrink-0" />
					</button>
				</form>
			{:else}
				<a
					href={resolve('/login')}
					class="text-sm font-medium text-brand-primary underline">Connexion</a
				>
			{/if}
		</div>

		<!-- Bouton menu (mobile) -->
		<button
			type="button"
			class="flex items-center rounded-md p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink md:hidden"
			aria-label="Menu"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			{#if open}<X size={22} />{:else}<Menu size={22} />{/if}
		</button>
	</div>

	<!-- Panneau mobile -->
	{#if open}
		<div class="border-t border-border bg-surface md:hidden">
			<nav class="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
				{@render navLink(resolve('/tournois-publics'), 'Tournois', CalendarRange)}
				{#if showOrgaNav}
					{@render navLink(resolve('/tournois'), 'Mes tournois', Trophy)}
				{/if}
				{#if showOrgaNav && user && isSuperAdmin(user.role)}
					{@render navLink(resolve('/admin'), 'Admin', Shield)}
				{/if}

				{#if user}
					{@render navLink(resolve('/compte'), 'Mon compte', User)}
					<div class="mt-2 flex flex-col gap-2 border-t border-border pt-3">
						{#if canSwitchView}
							{@render viewToggle(true)}
						{:else}
							<span class="text-xs text-ink-muted">
								Type de compte : <span class="font-medium text-ink">{roleLabel(user.role)}</span>
							</span>
						{/if}
						<form method="POST" action={resolve('/logout')}>
							<button
								type="submit"
								class="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
							>
								<LogOut size={16} /> Déconnexion
							</button>
						</form>
					</div>
				{:else}
					{@render navLink(resolve('/login'), 'Connexion', User)}
				{/if}
			</nav>
		</div>
	{/if}
</header>
