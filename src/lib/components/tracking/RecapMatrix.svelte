<script lang="ts">
	import { formatDay, formatTime } from '$lib/format';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import { Check, CircleHelp } from 'lucide-svelte';

	let { tournament }: { tournament: VolunteerTournament } = $props();

	type Cell = 'available' | 'maybe' | null;

	const matrix = $derived.by(() => {
		// Bénévoles uniques (ordre d'apparition), colonnes = créneaux groupés par poste.
		const volunteers = new Map<string, string>();
		const lookup = new Map<string, Cell>();
		const groups = tournament.positions.map((p) => ({
			name: p.name,
			color: p.color,
			shifts: p.shifts.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt }))
		}));

		for (const p of tournament.positions) {
			for (const s of p.shifts) {
				for (const su of s.signups) {
					if (!volunteers.has(su.userId)) volunteers.set(su.userId, su.name);
					lookup.set(`${su.userId}:${s.id}`, su.status);
				}
			}
		}
		return {
			volunteers: [...volunteers.entries()].map(([id, name]) => ({ id, name })),
			groups,
			lookup
		};
	});
</script>

{#if matrix.volunteers.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucune inscription pour le moment.
	</p>
{:else}
	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="border-collapse text-sm">
			<thead>
				<!-- Bandeau postes -->
				<tr class="border-b border-border bg-surface-subtle">
					<th
						rowspan="2"
						class="sticky left-0 z-10 border-r border-border bg-surface-subtle px-3 py-2 text-left font-semibold text-ink-strong"
					>
						Bénévole
					</th>
					{#each matrix.groups as g (g.name)}
						<th
							colspan={g.shifts.length}
							class="border-r border-border px-3 py-2 text-center font-semibold text-ink-strong"
						>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2.5 rounded-full" style="background-color: {g.color}"></span>
								{g.name}
							</span>
						</th>
					{/each}
				</tr>
				<!-- Bandeau créneaux -->
				<tr class="border-b border-border bg-surface-subtle text-xs text-ink-muted">
					{#each matrix.groups as g (g.name)}
						{#each g.shifts as s (s.id)}
							<th class="whitespace-nowrap border-r border-border px-3 py-1.5 font-medium">
								<div>{formatDay(s.startsAt)}</div>
								<div>{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</div>
							</th>
						{/each}
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each matrix.volunteers as v (v.id)}
					<tr class="border-b border-border/60 last:border-0 hover:bg-surface-subtle">
						<th
							class="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2 text-left font-medium text-ink-strong"
						>
							{v.name}
						</th>
						{#each matrix.groups as g (g.name)}
							{#each g.shifts as s (s.id)}
								{@const cell = matrix.lookup.get(`${v.id}:${s.id}`)}
								<td class="border-r border-border/60 px-3 py-2 text-center">
									{#if cell === 'available'}
										<Check size={16} class="mx-auto text-success" />
									{:else if cell === 'maybe'}
										<CircleHelp size={16} class="mx-auto text-warning" />
									{:else}
										<span class="text-ink-muted/40">·</span>
									{/if}
								</td>
							{/each}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
