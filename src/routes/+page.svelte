<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDateRange, formatDay, formatTimeRange } from '$lib/format';
	import { dayKeyOf } from '$lib/volunteer-shifts';
	import { hasOrganizerAccess } from '$lib/roles';
	import { CalendarDays, MapPin, LogIn, Clock } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Accueil orga uniquement si accès orga ET pas en vue bénévole (switch de vue, epic 10).
	const showOrganizerHome = $derived(hasOrganizerAccess(data.user?.role) && !data.volunteerView);

	/** Agenda perso groupé par jour (créneaux déjà triés par heure côté serveur). */
	const agendaDays = $derived.by(() => {
		const groups: { key: string; label: string; shifts: typeof data.myShifts }[] = [];
		const index = new Map<string, (typeof groups)[number]>();
		for (const s of data.myShifts) {
			const key = dayKeyOf(s.startsAt);
			let g = index.get(key);
			if (!g) {
				g = { key, label: formatDay(s.startsAt), shifts: [] };
				index.set(key, g);
				groups.push(g);
			}
			g.shifts.push(s);
		}
		return groups;
	});
</script>

<svelte:head><title>Bénévoles ACGB</title></svelte:head>

{#if showOrganizerHome}
	<!-- Organisateur -->
	<h1 class="text-2xl font-bold text-ink-strong">Bénévoles ACGB</h1>
	<p class="mt-2 text-ink-muted">Gère tes tournois, postes et créneaux.</p>
	<a href={resolve('/tournois')} class="mt-4 inline-block">
		<Button size="sm">Mes tournois</Button>
	</a>
{:else if data.user}
	<!-- Bénévole connecté : agenda de ses prochains créneaux + ses tournois -->
	<h1 class="text-2xl font-bold text-ink-strong">Mes créneaux</h1>

	{#if data.myShifts.length === 0}
		<div
			class="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-12 text-center"
		>
			<CalendarDays size={32} class="text-ink-muted" />
			<p class="text-ink-muted">
				Tu n'as aucun créneau à venir.<br />
				Parcours les tournois pour t'inscrire.
			</p>
			<a href={resolve('/tournois-publics')} class="mt-1 inline-block">
				<Button size="sm" variant="secondary">Voir les tournois</Button>
			</a>
		</div>
	{:else}
		<!-- Agenda : tous mes prochains créneaux, tous tournois confondus, par jour -->
		<div class="mt-6 flex flex-col gap-5">
			{#each agendaDays as g, gi (g.key)}
				<section class="fade-up flex flex-col gap-2" style="animation-delay: {gi * 60}ms">
					<h2 class="text-sm font-semibold text-ink-strong">{g.label}</h2>
					{#each g.shifts as s (s.shiftId)}
						<a
							href={resolve('/t/[token]', { token: s.shareToken })}
							class="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand-primary hover:shadow-sm"
						>
							<span class="inline-flex w-[5.5rem] shrink-0 items-center gap-1.5 text-sm text-ink">
								<Clock size={14} class="shrink-0 text-ink-muted" />
								{formatTimeRange(s.startsAt, s.endsAt)}
							</span>
							<span class="flex min-w-0 flex-1 flex-col">
								<span class="inline-flex items-center gap-1.5">
									<span
										class="size-2.5 shrink-0 rounded-full"
										style="background-color: {s.positionColor}"
									></span>
									<span class="truncate font-medium text-ink-strong">{s.positionName}</span>
								</span>
								<span class="truncate text-xs text-ink-muted">{s.tournamentName}</span>
							</span>
							<StatusBadge status={s.status} class="shrink-0" />
						</a>
					{/each}
				</section>
			{/each}
		</div>
	{/if}

	<!-- Mes tournois (accès rapide à chaque page d'inscription) -->
	{#if data.myTournaments.length > 0}
		<h2 class="mt-10 text-lg font-semibold text-ink-strong">Mes tournois</h2>
		<ul class="mt-3 flex flex-col gap-3">
			{#each data.myTournaments as t (t.id)}
				<li>
					<a
						href={resolve('/t/[token]', { token: t.shareToken })}
						class="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand-primary hover:shadow-sm"
					>
						<div class="flex items-start justify-between gap-2">
							<h3 class="font-semibold text-ink-strong">{t.name}</h3>
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
	<div class="mt-4 flex flex-wrap gap-2">
		<a href={resolve('/tournois-publics')} class="inline-block">
			<Button size="sm">Voir les tournois</Button>
		</a>
		<a href={resolve('/login')} class="inline-block">
			<Button size="sm" variant="secondary"><LogIn size={16} /> Se connecter</Button>
		</a>
	</div>
{/if}
