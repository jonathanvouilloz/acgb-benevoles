<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDateRange, formatDay, formatTimeRange } from '$lib/format';
	import { CalendarDays, MapPin, LogIn, Star } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bénévoles ACGB</title></svelte:head>

{#if data.user?.isOrganizer}
	<!-- Organisateur -->
	<h1 class="text-2xl font-bold text-ink-strong">Bénévoles ACGB</h1>
	<p class="mt-2 text-ink-muted">Gère tes tournois, postes et créneaux.</p>
	<a href={resolve('/tournois')} class="mt-4 inline-block">
		<Button size="sm">Mes tournois</Button>
	</a>
{:else if data.user}
	<!-- Bénévole connecté : ses inscriptions -->
	<h1 class="text-2xl font-bold text-ink-strong">Mes inscriptions</h1>

	{#if data.myTournaments.length === 0}
		<div
			class="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-12 text-center"
		>
			<CalendarDays size={32} class="text-ink-muted" />
			<p class="text-ink-muted">
				Tu n'es inscrit à aucun tournoi pour l'instant.<br />
				Utilise le lien partagé par ton organisateur pour t'inscrire.
			</p>
		</div>
	{:else}
		<ul class="mt-6 flex flex-col gap-3">
			{#each data.myTournaments as t, i (t.id)}
				<li class="fade-up" style="animation-delay: {i * 60}ms">
					<a
						href={resolve('/t/[token]', { token: t.shareToken })}
						class="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand-primary hover:shadow-sm"
					>
						<div class="flex items-start justify-between gap-2">
							<h2 class="font-semibold text-ink-strong">{t.name}</h2>
							<span class="shrink-0 text-xs text-ink-muted">
								{t.signupCount} créneau{t.signupCount > 1 ? 'x' : ''}
							</span>
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

						{#if t.nextShift}
							<div
								class="mt-3 flex flex-wrap items-center gap-2 rounded border border-border bg-surface-subtle px-3 py-2 text-sm"
							>
								<Star size={14} class="shrink-0 text-brand-primary" />
								<span class="text-ink-muted">Prochain :</span>
								<span class="inline-flex items-center gap-1.5">
									<span
										class="size-2.5 shrink-0 rounded-full"
										style="background-color: {t.nextShift.positionColor}"
									></span>
									<span class="font-medium text-ink-strong">{t.nextShift.positionName}</span>
								</span>
								<span class="text-ink">
									{formatDay(t.nextShift.startsAt)} · {formatTimeRange(
										t.nextShift.startsAt,
										t.nextShift.endsAt
									)}
								</span>
								<StatusBadge status={t.nextShift.status} class="ml-auto" />
							</div>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{:else}
	<!-- Visiteur non connecté -->
	<h1 class="text-2xl font-bold text-ink-strong">Bénévoles ACGB</h1>
	<p class="mt-2 text-ink-muted">
		Inscris-toi aux créneaux des tournois de l'ACGB. Connecte-toi pour voir tes inscriptions.
	</p>
	<a href={resolve('/login')} class="mt-4 inline-block">
		<Button size="sm"><LogIn size={16} /> Se connecter</Button>
	</a>
{/if}
