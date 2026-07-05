<script lang="ts">
	import { resolve } from '$app/paths';
	import { PhaseBadge } from '$lib/components/ui/phase-badge';
	import { formatDateRange } from '$lib/format';
	import { CalendarDays, MapPin, User, ExternalLink } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Tournois — Administration</title></svelte:head>

<h1 class="h1">Tous les tournois ({data.tournaments.length})</h1>

{#if data.tournaments.length === 0}
	<p class="mt-6 text-sm text-ink-muted">Aucun tournoi pour le moment.</p>
{:else}
	<ul class="mt-6 grid gap-2 lg:grid-cols-2">
		{#each data.tournaments as t (t.id)}
			<li class="rounded-lg border border-border bg-surface p-4">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h2 class="h3">{t.name}</h2>
							<PhaseBadge phase={t.phase} />
						</div>
						<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
							<CalendarDays size={15} />
							{formatDateRange(t.startDate, t.endDate)}
						</p>
						{#if t.location}
							<p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
								<MapPin size={15} />
								{t.location}
							</p>
						{/if}
						<p class="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
							<User size={14} />
							{t.organizerName} · {t.organizerEmail}
						</p>
					</div>
					<div class="flex flex-col items-end gap-1.5">
						<span class="text-sm font-medium text-ink">
							{t.signupCount} inscription{t.signupCount > 1 ? 's' : ''}
						</span>
						<a
							href={resolve('/t/[token]', { token: t.shareToken })}
							class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
						>
							Voir <ExternalLink size={13} />
						</a>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}
