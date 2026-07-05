<script lang="ts">
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import type { RecapRow } from '$lib/recap';
	import { Phone } from 'lucide-svelte';

	let { rows }: { rows: RecapRow[] } = $props();

	type VolunteerGroup = {
		userId: string;
		name: string;
		phone: string | null;
		assignments: RecapRow[];
	};

	/** Regroupe les lignes filtrées par bénévole (ignore les créneaux « à pourvoir »). */
	const groups = $derived.by(() => {
		const map = new Map<string, VolunteerGroup>();
		for (const r of rows) {
			if (r.status === 'empty' || !r.userId) continue;
			let g = map.get(r.userId);
			if (!g) {
				g = { userId: r.userId, name: r.volunteerName, phone: r.phone, assignments: [] };
				map.set(r.userId, g);
			}
			g.assignments.push(r);
		}
		const out = [...map.values()];
		for (const g of out) g.assignments.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
		out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
		return out;
	});
</script>

{#if groups.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucun bénévole ne correspond aux filtres.
	</p>
{:else}
	<div class="grid gap-3 sm:grid-cols-2">
		{#each groups as g (g.userId)}
			<div class="rounded-lg border border-border bg-surface p-4">
				<div class="flex items-baseline justify-between gap-2">
					<h3 class="h3">{g.name}</h3>
					<span class="shrink-0 text-xs text-ink-muted">
						{g.assignments.length} créneau{g.assignments.length > 1 ? 'x' : ''}
					</span>
				</div>
				{#if g.phone}
					<a
						href="tel:{g.phone}"
						class="mt-0.5 inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-brand-primary"
					>
						<Phone size={13} />
						{g.phone}
					</a>
				{/if}
				<ul class="mt-3 flex flex-col gap-2">
					{#each g.assignments as a (a.shiftId)}
						<li class="flex flex-col gap-0.5 text-sm">
							<div class="flex items-center justify-between gap-2">
								<span class="flex min-w-0 items-center gap-1.5">
									<span
										class="size-2.5 shrink-0 rounded-full"
										style="background-color: {a.positionColor}"
									></span>
									<span class="truncate text-ink">{a.positionName}</span>
								</span>
								<span class="flex shrink-0 items-center gap-2">
									<span class="whitespace-nowrap text-ink-muted">
										{formatDay(a.day)} · {formatTimeRange(a.startsAt, a.endsAt)}
									</span>
									{#if a.status !== 'empty'}<StatusBadge status={a.status} />{/if}
								</span>
							</div>
							{#if a.note}
								<p class="pl-4 text-xs italic text-ink-muted">« {a.note} »</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/if}
