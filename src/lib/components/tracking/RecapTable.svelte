<script lang="ts">
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import type { RecapRow } from '$lib/recap';
	import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-svelte';

	let { rows }: { rows: RecapRow[] } = $props();

	type SortKey = 'volunteerName' | 'positionName' | 'day' | 'status';
	let sortKey = $state<SortKey>('day');
	let sortDir = $state<1 | -1>(1);

	const statusRank: Record<RecapRow['status'], number> = { available: 0, maybe: 1, empty: 2 };

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
		else {
			sortKey = key;
			sortDir = 1;
		}
	}

	const sorted = $derived.by(() => {
		const out = [...rows];
		out.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'volunteerName':
					cmp = a.volunteerName.localeCompare(b.volunteerName, 'fr');
					break;
				case 'positionName':
					cmp = a.positionName.localeCompare(b.positionName, 'fr');
					break;
				case 'status':
					cmp = statusRank[a.status] - statusRank[b.status];
					break;
				case 'day':
					cmp = a.startsAt.getTime() - b.startsAt.getTime();
					break;
			}
			// Tri secondaire stable par horaire puis poste.
			if (cmp === 0) cmp = a.startsAt.getTime() - b.startsAt.getTime();
			return cmp * sortDir;
		});
		return out;
	});

	const columns: { key: SortKey; label: string }[] = [
		{ key: 'volunteerName', label: 'Bénévole' },
		{ key: 'positionName', label: 'Poste' },
		{ key: 'day', label: 'Créneau' },
		{ key: 'status', label: 'Statut' }
	];
</script>

{#if rows.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucune ligne ne correspond aux filtres.
	</p>
{:else}
	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="w-full min-w-[36rem] border-collapse text-sm">
			<thead>
				<tr class="border-b border-border bg-surface-subtle text-left">
					{#each columns as col (col.key)}
						<th class="px-4 py-3 font-semibold text-ink-strong">
							<button
								type="button"
								onclick={() => toggleSort(col.key)}
								class="inline-flex items-center gap-1 transition-colors hover:text-brand-primary"
							>
								{col.label}
								{#if sortKey === col.key}
									{#if sortDir === 1}<ArrowUp size={13} />{:else}<ArrowDown size={13} />{/if}
								{:else}
									<ChevronsUpDown size={13} class="text-ink-muted/50" />
								{/if}
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sorted as row (row.shiftId + row.volunteerName)}
					<tr
						class="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-subtle"
					>
						<td class="px-4 py-3 text-ink-strong">
							{#if row.status === 'empty'}
								<span class="text-ink-muted">—</span>
							{:else}
								{row.volunteerName}
							{/if}
						</td>
						<td class="px-4 py-3 text-ink">
							<span class="inline-flex items-center gap-1.5">
								<span
									class="size-2.5 shrink-0 rounded-full"
									style="background-color: {row.positionColor}"
								></span>
								{row.positionName}
							</span>
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-ink">
							<span class="font-medium text-ink-strong">{formatDay(row.day)}</span>
							<span class="text-ink-muted">· {formatTimeRange(row.startsAt, row.endsAt)}</span>
						</td>
						<td class="px-4 py-3">
							{#if row.status === 'empty'}
								<span
									class="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-sm font-medium text-ink-muted"
								>
									À pourvoir
								</span>
							{:else}
								<StatusBadge status={row.status} />
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
