<script lang="ts">
	import { resolve } from '$app/paths';
	import { PhaseBadge } from '$lib/components/ui/phase-badge';
	import { formatDateRange } from '$lib/format';
	import { phaseLabel, type TournamentPhase } from '$lib/tournament-status';
	import { CalendarDays, MapPin, User, ChevronRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Regroupement par phase, dans l'ordre En cours → À venir → Terminés. */
	const order: TournamentPhase[] = ['ongoing', 'upcoming', 'past'];
	const groups = $derived(
		order
			.map((phase) => ({ phase, items: data.tournaments.filter((t) => t.phase === phase) }))
			.filter((g) => g.items.length > 0)
	);
</script>

<svelte:head><title>Tournois — Bénévoles ACGB</title></svelte:head>

<h1 class="h1">Tournois</h1>
<p class="mt-1 text-sm text-ink-muted">
	Tous les tournois de l'ACGB. Ouvre-en un pour t'inscrire comme bénévole.
</p>

{#if data.tournaments.length === 0}
	<div
		class="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-12 text-center"
	>
		<CalendarDays size={32} class="text-ink-muted" />
		<p class="text-ink-muted">Aucun tournoi pour le moment.</p>
	</div>
{:else}
	<div class="mt-6 flex flex-col gap-8">
		{#each groups as g (g.phase)}
			<section class="flex flex-col gap-2">
				<h2 class="flex items-center gap-2 h2">
					{phaseLabel(g.phase)}
					<span class="text-xs font-normal text-ink-muted">({g.items.length})</span>
				</h2>
				<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each g.items as t (t.id)}
						<li>
							<a
								href={resolve('/t/[token]', { token: t.shareToken })}
								class="flex h-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand-primary hover:shadow-sm
									{t.phase === 'past' ? 'opacity-70' : ''}"
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h3 class="truncate h3">{t.name}</h3>
										<PhaseBadge phase={t.phase} class="shrink-0" />
									</div>
									<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
										<CalendarDays size={15} class="shrink-0" />
										{formatDateRange(t.startDate, t.endDate)}
									</p>
									<div class="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-muted">
										{#if t.location}
											<span class="flex items-center gap-1.5"><MapPin size={15} /> {t.location}</span>
										{/if}
										<span class="flex items-center gap-1.5"><User size={14} /> {t.organizerName}</span>
									</div>
								</div>
								<ChevronRight size={18} class="shrink-0 text-ink-muted" />
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}
