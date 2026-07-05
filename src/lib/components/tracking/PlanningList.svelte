<script lang="ts">
	import { formatDay, formatTimeRange } from '$lib/format';
	import type { PlanningPoste } from '$lib/recap';
	import { Check, CircleHelp } from 'lucide-svelte';

	let { postes }: { postes: PlanningPoste[] } = $props();
</script>

{#if postes.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucune inscription pour le moment.
	</p>
{:else}
	<div class="flex flex-col gap-5">
		{#each postes as p (p.id)}
			<section>
				<!-- En-tête poste -->
				<h2 class="mb-2 flex items-center gap-2 h2">
					<span class="size-2.5 shrink-0 rounded-full" style="background-color: {p.color}"></span>
					{p.name}
				</h2>

				<div class="flex flex-col gap-2">
					{#each p.shifts as s (s.id)}
						<article class="rounded-lg border border-border bg-surface p-3">
							<!-- Ligne créneau + places -->
							<div class="flex items-start justify-between gap-2">
								<div class="text-sm">
									<div class="font-medium text-ink-strong">{formatDay(s.startsAt)}</div>
									<div class="text-ink-muted">{formatTimeRange(s.startsAt, s.endsAt)}</div>
								</div>
								<div class="text-right">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold {s.isFull
											? 'bg-success/12 text-success'
											: 'bg-warning/12 text-warning'}"
									>
										{s.availableCount}/{s.capacity}
									</span>
									{#if !s.isFull}
										<div class="mt-0.5 text-xs font-medium text-warning">
											{s.remaining} à pourvoir
										</div>
									{/if}
								</div>
							</div>

							<!-- Bénévoles disponibles -->
							{#if s.available.length > 0}
								<ul class="mt-2 flex flex-wrap gap-1.5">
									{#each s.available as p (p.name)}
										<li
											class="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-ink"
										>
											<Check size={13} class="shrink-0 text-success" />
											{p.name}{#if p.note}<span class="font-normal text-ink-muted">· {p.note}</span
												>{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="mt-2 text-xs italic text-ink-muted">Personne d'inscrit pour l'instant.</p>
							{/if}

							<!-- Peut-être -->
							{#if s.maybe.length > 0}
								<p class="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-warning">
									<CircleHelp size={13} class="shrink-0" />
									<span class="font-medium">Peut-être :</span>
									{s.maybe.map((p) => (p.note ? `${p.name} (${p.note})` : p.name)).join(', ')}
								</p>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}
