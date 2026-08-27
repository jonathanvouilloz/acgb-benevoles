<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import ActivityLogList from '$lib/components/tracking/ActivityLogList.svelte';
	import { ACTOR_FILTERS, TARGET_FILTERS } from '$lib/activity-log';
	import { Search, History } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let targetFilter = $state('all');
	let actorFilter = $state('all');

	// Filtrage côté client, comme la matrice de suivi : la fenêtre chargée tient en mémoire, et
	// un aller-retour serveur par frappe rendrait la recherche poussive.
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return data.entries.filter((e) => {
			if (targetFilter !== 'all' && e.targetType !== targetFilter) return false;
			// `super_admin` agit comme un organisateur : le filtre oppose les gestes de l'équipe
			// d'organisation à ceux venus du lien public.
			if (actorFilter === 'organizer' && e.actorRole === 'volunteer') return false;
			if (actorFilter === 'volunteer' && e.actorRole !== 'volunteer') return false;
			if (q) {
				const haystack = `${e.actorName} ${e.volunteerName ?? ''} ${e.detail}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	});

	const isFiltering = $derived(
		search.trim() !== '' || targetFilter !== 'all' || actorFilter !== 'all'
	);
</script>

<svelte:head><title>Journal d'activité — Bénévoles ACGB</title></svelte:head>

<h1 class="h1">Journal d'activité</h1>
<p class="mt-1 text-sm text-ink-muted">
	Tout ce qui a été fait sur ce tournoi, du plus récent au plus ancien — vos actions comme celles
	des bénévoles depuis le lien de partage.
</p>

<div class="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
	<div class="relative">
		<Search
			size={16}
			class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
		/>
		<Input
			type="search"
			bind:value={search}
			placeholder="Rechercher un nom, un poste, un créneau…"
			class="pl-8"
		/>
	</div>
	<div class="flex flex-wrap gap-2">
		<Select bind:value={targetFilter} options={[...TARGET_FILTERS]} class="flex-1" />
		<Select bind:value={actorFilter} options={[...ACTOR_FILTERS]} class="flex-1" />
	</div>
</div>

{#if data.entries.length === 0}
	<div class="mt-6 rounded-lg border border-border bg-surface-subtle px-6 py-12 text-center">
		<History size={32} class="mx-auto text-ink-muted" />
		<p class="mt-3 text-sm text-ink-muted">
			Rien à afficher pour l'instant. Chaque poste créé, créneau modifié ou inscription apparaîtra
			ici.
		</p>
	</div>
{:else if filtered.length === 0}
	<p
		class="mt-6 rounded-lg border border-border bg-surface-subtle p-4 text-center text-sm text-ink-muted"
	>
		Aucun événement ne correspond à ces filtres.
	</p>
{:else}
	<p class="mt-6 text-sm text-ink-muted">
		{filtered.length}
		{filtered.length > 1 ? 'événements' : 'événement'}{isFiltering
			? ` sur ${data.entries.length}`
			: ''}
	</p>
	<div class="mt-2">
		<ActivityLogList entries={filtered} />
	</div>

	{#if data.hasMore}
		<!-- Pagination par l'URL : pas de JS, et le lien reste partageable. -->
		<div class="mt-3 text-center">
			<a
				href="{resolve('/tournois/[id]/journal', {
					id: page.params.id ?? ''
				})}?limit={data.limit + 100}"
				class="inline-flex items-center rounded border border-border bg-surface px-3 py-2 text-sm text-ink-muted transition hover:border-brand-primary hover:text-ink"
			>
				Charger 100 événements de plus
			</a>
		</div>
	{/if}
{/if}
