<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Settings, ClipboardList, History } from 'lucide-svelte';

	let { children }: { children: import('svelte').Snippet } = $props();

	const id = $derived(page.params.id ?? '');
	const current = $derived(page.url.pathname);

	// L'onglet Gestion est la racine : sans égalité stricte il resterait actif sur tous ses enfants.
	const active = $derived(
		current === resolve('/tournois/[id]', { id })
			? 'gestion'
			: current.startsWith(resolve('/tournois/[id]/journal', { id }))
				? 'journal'
				: 'suivi'
	);

	const base =
		'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition';
	const on = 'bg-brand-primary/10 text-brand-primary';
	const off = 'text-ink-muted hover:bg-surface-subtle hover:text-ink';
</script>

<nav class="flex flex-wrap gap-1.5 print:hidden">
	<a href={resolve('/tournois/[id]', { id })} class="{base} {active === 'gestion' ? on : off}">
		<Settings size={15} class="shrink-0" />
		Gestion
	</a>
	<a href={resolve('/tournois/[id]/suivi', { id })} class="{base} {active === 'suivi' ? on : off}">
		<ClipboardList size={15} class="shrink-0" />
		Suivi
	</a>
	<a
		href={resolve('/tournois/[id]/journal', { id })}
		class="{base} {active === 'journal' ? on : off}"
	>
		<History size={15} class="shrink-0" />
		Journal
	</a>
</nav>

<div class="mt-4">
	{@render children()}
</div>
