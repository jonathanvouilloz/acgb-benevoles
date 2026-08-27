<script lang="ts">
	import { resolve } from '$app/paths';
	import ActivityLogList from '$lib/components/tracking/ActivityLogList.svelte';
	import type { ActivityLogRow } from '$lib/activity-log';
	import { ChevronDown, ArrowRight } from 'lucide-svelte';

	let { entries, tournamentId }: { entries: ActivityLogRow[]; tournamentId: string } = $props();
</script>

<!-- Repliée par défaut : c'est une pièce de contrôle, pas la vue de travail. Le journal complet
     (filtres, pagination) vit sur sa propre page — ici on ne montre que les derniers événements. -->
<section class="mx-auto mt-6 w-full max-w-5xl print:hidden">
	<details class="group">
		<summary
			class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
		>
			<span class="text-sm font-semibold text-ink-strong">Activité récente</span>
			<ChevronDown
				size={16}
				class="shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180"
			/>
		</summary>

		{#if entries.length === 0}
			<p
				class="mt-2 rounded-lg border border-border bg-surface-subtle p-4 text-center text-sm text-ink-muted"
			>
				Aucune activité pour le moment. Les inscriptions, retraits et modifications apparaîtront
				ici.
			</p>
		{:else}
			<div class="mt-2">
				<ActivityLogList {entries} />
			</div>
		{/if}

		<div class="mt-2 text-right">
			<a
				href={resolve('/tournois/[id]/journal', { id: tournamentId })}
				class="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
			>
				Voir tout le journal
				<ArrowRight size={14} />
			</a>
		</div>
	</details>
</section>
