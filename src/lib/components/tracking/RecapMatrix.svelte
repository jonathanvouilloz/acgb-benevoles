<script lang="ts">
	import { formatDay, formatTime } from '$lib/format';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import { Check, CircleHelp } from 'lucide-svelte';

	let {
		tournament,
		positionId = 'all',
		day = 'all'
	}: { tournament: VolunteerTournament; positionId?: string; day?: string } = $props();

	type Cell = 'available' | 'maybe' | null;
	type MatrixShift = {
		id: string;
		startsAt: Date;
		endsAt: Date;
		capacity: number;
		availableCount: number;
		remaining: number;
		isFull: boolean;
	};

	const matrix = $derived.by(() => {
		// Bénévoles uniques (ordre d'apparition), colonnes = créneaux groupés par poste.
		const volunteers = new Map<string, string>();
		const lookup = new Map<string, Cell>();
		const groups: { name: string; color: string; shifts: MatrixShift[] }[] = [];

		for (const p of tournament.positions) {
			if (positionId !== 'all' && p.id !== positionId) continue;
			const shifts: MatrixShift[] = [];
			for (const s of p.shifts) {
				if (day !== 'all' && s.startsAt.toISOString().slice(0, 10) !== day) continue;
				shifts.push({
					id: s.id,
					startsAt: s.startsAt,
					endsAt: s.endsAt,
					capacity: s.capacity,
					availableCount: s.availableCount,
					remaining: s.remaining,
					isFull: s.isFull
				});
				for (const su of s.signups) {
					if (!volunteers.has(su.userId)) volunteers.set(su.userId, su.name);
					lookup.set(`${su.userId}:${s.id}`, su.status);
				}
			}
			if (shifts.length > 0) groups.push({ name: p.name, color: p.color, shifts });
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
	<!-- Légende -->
	<div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
		<span class="inline-flex items-center gap-1"><Check size={14} class="text-success" /> Disponible</span>
		<span class="inline-flex items-center gap-1"
			><CircleHelp size={14} class="text-warning" /> Peut-être</span
		>
		<span class="inline-flex items-center gap-1"><span class="text-ink-muted/40">·</span> Non inscrit</span>
		<span class="inline-flex items-center gap-1">
			<span class="inline-block rounded bg-warning/12 px-1.5 font-semibold text-warning">X/Y</span>
			places pourvues
		</span>
	</div>

	<div class="overflow-x-auto rounded-lg border border-border">
		<table class="border-collapse text-sm">
			<thead>
				<!-- Bandeau postes -->
				<tr class="bg-surface-subtle">
					<th
						rowspan="3"
						class="sticky left-0 z-10 border-b border-r border-border bg-surface-subtle px-3 py-2 text-left font-semibold text-ink-strong"
					>
						Bénévole
					</th>
					{#each matrix.groups as g (g.name)}
						<th
							colspan={g.shifts.length}
							class="border-b border-r border-border bg-surface-subtle px-3 py-2 text-center font-semibold text-ink-strong"
						>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2.5 rounded-full" style="background-color: {g.color}"></span>
								{g.name}
							</span>
						</th>
					{/each}
				</tr>
				<!-- Bandeau créneaux -->
				<tr class="bg-surface-subtle text-xs text-ink-muted">
					{#each matrix.groups as g (g.name)}
						{#each g.shifts as s (s.id)}
							<th class="whitespace-nowrap border-b border-r border-border px-3 py-1.5 font-medium">
								<div>{formatDay(s.startsAt)}</div>
								<div>{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</div>
							</th>
						{/each}
					{/each}
				</tr>
				<!-- Bandeau places X/Y -->
				<tr class="text-xs">
					{#each matrix.groups as g (g.name)}
						{#each g.shifts as s (s.id)}
							<th
								class="border-b border-r border-border px-3 py-1 text-center font-semibold {s.isFull
									? 'bg-success/10 text-success'
									: 'bg-warning/10 text-warning'}"
							>
								{s.availableCount}/{s.capacity}
								{#if !s.isFull}
									<span class="block font-normal">{s.remaining} à pourvoir</span>
								{/if}
							</th>
						{/each}
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each matrix.volunteers as v (v.id)}
					<tr class="hover:bg-surface-subtle">
						<th
							class="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-ink-strong"
						>
							{v.name}
						</th>
						{#each matrix.groups as g (g.name)}
							{#each g.shifts as s (s.id)}
								{@const cell = matrix.lookup.get(`${v.id}:${s.id}`)}
								<td class="border-b border-r border-border/60 px-3 py-2 text-center">
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
