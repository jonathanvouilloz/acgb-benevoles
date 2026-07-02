<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { LayoutDashboard, Users, Trophy } from 'lucide-svelte';

	let { children }: { children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
		{ href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
		{ href: '/admin/tournois', label: 'Tournois', icon: Trophy }
	] as const;

	const current = $derived(page.url.pathname);
	const isActive = (href: string) =>
		href === '/admin' ? current === '/admin' : current.startsWith(href);
</script>

<div class="flex flex-col gap-1">
	<span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Administration</span>
	<nav class="flex flex-wrap gap-1.5">
		{#each nav as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition
					{isActive(item.href)
					? 'bg-brand-primary/10 text-brand-primary'
					: 'text-ink-muted hover:bg-surface-subtle hover:text-ink'}"
			>
				<Icon size={15} class="shrink-0" />
				{item.label}
			</a>
		{/each}
	</nav>
</div>

<div class="mt-6">
	{@render children()}
</div>
