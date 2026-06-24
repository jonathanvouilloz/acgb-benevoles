<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import VolunteerShiftRow from '$lib/components/tournament/VolunteerShiftRow.svelte';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateRange } from '$lib/format';
	import {
		flattenShifts,
		splitByTime,
		nextOwnShift,
		filterShifts,
		groupByTime,
		groupByPosition,
		distinctDays,
		distinctSlots,
		presentPositionIds,
		totalRemaining,
		SLOT_LABELS,
		type TimeSlot
	} from '$lib/volunteer-shifts';
	import {
		CalendarDays,
		MapPin,
		LogIn,
		Star,
		ChevronDown,
		User,
		Mail,
		Phone,
		Clock,
		LayoutGrid,
		X
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const t = $derived(data.tournament);
	const myId = $derived(data.me?.id ?? null);

	// `now` côté client : on l'initialise au montage pour éviter tout décalage SSR.
	let now = $state(Date.now());

	const all = $derived(flattenShifts(t));
	const split = $derived(splitByTime(all, now));
	const upcoming = $derived(split.upcoming);
	const next = $derived(nextOwnShift(upcoming));
	/** Base de la liste filtrable : les à-venir hors créneau mis en avant (évite le doublon). */
	const base = $derived(upcoming.filter((s) => s.id !== next?.id));

	// --- État des filtres ---
	let day = $state<string | null>(null);
	let slot = $state<TimeSlot | null>(null);
	let positionId = $state<string | null>(null);
	let onlyAvailable = $state(false);
	let onlyMine = $state(false);
	let groupBy = $state<'time' | 'position'>('time');
	let showPast = $state(false);

	// Options de filtres calculées d'après les créneaux réellement présents.
	const dayOpts = $derived(distinctDays(upcoming));
	const slotOpts = $derived(distinctSlots(upcoming));
	const posPresent = $derived(presentPositionIds(upcoming));
	const positionChips = $derived(t.positions.filter((p) => posPresent.has(p.id)));
	const myCount = $derived(upcoming.filter((s) => s.myStatus !== null).length);

	const filtered = $derived(filterShifts(base, { day, slot, positionId, onlyAvailable, onlyMine }));
	const remaining = $derived(totalRemaining(filtered));
	const timeGroups = $derived(groupByTime(filtered));
	const positionGroups = $derived(groupByPosition(filtered, t.positions));

	function resetFilters() {
		day = null;
		slot = null;
		positionId = null;
		onlyAvailable = false;
		onlyMine = false;
	}

	const chipBase =
		'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors';
	const chipOn = 'border-brand-primary bg-brand-primary text-white';
	const chipOff = 'border-border text-ink hover:bg-surface-muted';
</script>

<svelte:head><title>{t.name} — Bénévoles ACGB</title></svelte:head>

<header class="flex flex-col gap-1">
	<h1 class="text-2xl font-bold text-ink-strong">{t.name}</h1>
	<p class="flex items-center gap-1.5 text-sm text-ink-muted">
		<CalendarDays size={15} />
		{formatDateRange(t.startDate, t.endDate)}
	</p>
	{#if t.location}
		<p class="flex items-center gap-1.5 text-sm text-ink-muted">
			<MapPin size={15} />
			{t.location}
		</p>
	{/if}
</header>

<!-- Contact organisateur — pour joindre la personne qui gère le tournoi -->
<section class="mt-4 rounded-lg border border-border bg-surface-subtle p-4">
	<h2 class="flex items-center gap-1.5 text-sm font-semibold text-ink-strong">
		<User size={15} /> Organisateur
	</h2>
	<div class="mt-2 flex flex-col gap-1 text-sm text-ink">
		<span class="font-medium">{t.organizer.name}</span>
		<a
			href="mailto:{t.organizer.email}"
			class="inline-flex w-fit items-center gap-1.5 text-ink-muted hover:text-brand-primary"
		>
			<Mail size={14} />
			{t.organizer.email}
		</a>
		{#if t.organizer.phone}
			<a
				href="tel:{t.organizer.phone}"
				class="inline-flex w-fit items-center gap-1.5 text-ink-muted hover:text-brand-primary"
			>
				<Phone size={14} />
				{t.organizer.phone}
			</a>
		{/if}
	</div>
</section>

{#if data.needsPhone}
	<div class="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
		<p class="text-sm text-ink">
			Ajoute ton numéro de téléphone pour pouvoir t'inscrire (au cas où l'organisateur doit te
			joindre).
		</p>
		<a href={resolve('/compte')} class="mt-2 inline-block">
			<Button size="sm" variant="secondary"><Phone size={16} /> Compléter mon profil</Button>
		</a>
	</div>
{/if}

{#if !data.isLoggedIn}
	<div
		class="mt-4 flex flex-col gap-3 rounded-lg border border-info/40 bg-info/10 p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<p class="text-sm text-ink">Connecte-toi pour t'inscrire sur un créneau.</p>
		<a href="{resolve('/login')}?redirect={encodeURIComponent(page.url.pathname)}">
			<Button size="sm" class="w-full sm:w-auto"><LogIn size={16} /> Se connecter</Button>
		</a>
	</div>
{:else}
	<div class="mt-4">
		<EnableNotifications />
	</div>
{/if}

{#if t.positions.length === 0 || all.length === 0}
	<p class="mt-6 text-ink-muted">Aucun créneau n'a encore été défini pour ce tournoi.</p>
{:else}
	<!-- Ton prochain créneau -->
	{#if next}
		<section class="mt-6">
			<h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
				<Star size={15} /> Ton prochain créneau
			</h2>
			<VolunteerShiftRow
				shift={next}
				isLoggedIn={data.isLoggedIn}
				{myId}
				{form}
				positionName={next.positionName}
				positionColor={next.positionColor}
				featured
			/>
		</section>
	{/if}

	{#if base.length > 0}
		<!-- Barre de filtres (collante en haut pendant le scroll) -->
		<section
			class="sticky top-0 z-10 -mx-4 mt-6 flex flex-col gap-2.5 border-b border-border bg-surface px-4 py-3"
		>
			<!-- Jour (segmenté) — seulement si le tournoi s'étale sur plusieurs jours -->
			{#if dayOpts.length > 1}
				<div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
					<button class="{chipBase} {day === null ? chipOn : chipOff}" onclick={() => (day = null)}>
						Tout
					</button>
					{#each dayOpts as d (d.value)}
						<button
							class="{chipBase} {day === d.value ? chipOn : chipOff}"
							onclick={() => (day = day === d.value ? null : d.value)}
						>
							{d.label}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Tranche horaire + bascules dispo / mes inscriptions -->
			<div class="-mx-1 flex flex-wrap gap-1.5 px-1">
				{#each slotOpts as s (s)}
					<button
						class="{chipBase} {slot === s ? chipOn : chipOff}"
						onclick={() => (slot = slot === s ? null : s)}
					>
						{SLOT_LABELS[s]}
					</button>
				{/each}
				<button
					class="{chipBase} {onlyAvailable ? chipOn : chipOff}"
					onclick={() => (onlyAvailable = !onlyAvailable)}
				>
					Places dispo
				</button>
				{#if data.isLoggedIn && myCount > 0}
					<button
						class="{chipBase} {onlyMine ? chipOn : chipOff}"
						onclick={() => (onlyMine = !onlyMine)}
					>
						Mes créneaux ({myCount})
					</button>
				{/if}
			</div>

			<!-- Postes (color-codés) -->
			{#if positionChips.length > 1}
				<div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
					<button
						class="{chipBase} {positionId === null ? chipOn : chipOff}"
						onclick={() => (positionId = null)}
					>
						Tous les postes
					</button>
					{#each positionChips as p (p.id)}
						<button
							class="{chipBase} {positionId === p.id ? chipOn : chipOff}"
							onclick={() => (positionId = positionId === p.id ? null : p.id)}
						>
							<span class="size-2.5 shrink-0 rounded-full" style="background-color: {p.color}"
							></span>
							{p.name}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Compteur + bascule de regroupement -->
			<div class="flex items-center justify-between gap-2 pt-0.5">
				<p class="text-xs text-ink-muted">
					{filtered.length} créneau{filtered.length > 1 ? 'x' : ''} · {remaining} place{remaining >
					1
						? 's'
						: ''} à pourvoir
				</p>
				<div class="flex items-center gap-1 rounded-full border border-border p-0.5">
					<button
						class="inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors {groupBy ===
						'time'
							? 'bg-brand-primary text-white'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => (groupBy = 'time')}
					>
						<Clock size={13} /> Temps
					</button>
					<button
						class="inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors {groupBy ===
						'position'
							? 'bg-brand-primary text-white'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => (groupBy = 'position')}
					>
						<LayoutGrid size={13} /> Poste
					</button>
				</div>
			</div>
		</section>

		<!-- Liste filtrée et regroupée -->
		{#if filtered.length === 0}
			<div class="mt-6 flex flex-col items-start gap-2">
				<p class="text-sm text-ink-muted">Aucun créneau ne correspond à ces filtres.</p>
				<button
					onclick={resetFilters}
					class="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
				>
					<X size={14} /> Réinitialiser les filtres
				</button>
			</div>
		{:else if groupBy === 'time'}
			<div class="mt-4 flex flex-col gap-5">
				{#each timeGroups as g (g.key)}
					<section class="flex flex-col gap-2">
						<h3 class="text-sm font-semibold text-ink-strong">
							{g.dayLabel} · <span class="text-ink-muted">{g.slotLabel}</span>
						</h3>
						{#each g.shifts as shift (shift.id)}
							<VolunteerShiftRow
								{shift}
								isLoggedIn={data.isLoggedIn}
								{myId}
								{form}
								positionName={shift.positionName}
								positionColor={shift.positionColor}
								showDay={false}
							/>
						{/each}
					</section>
				{/each}
			</div>
		{:else}
			<div class="mt-4 flex flex-col gap-5">
				{#each positionGroups as g (g.id)}
					<section class="flex flex-col gap-2">
						<h3 class="flex items-center gap-1.5 text-sm font-semibold text-ink-strong">
							<span class="size-2.5 shrink-0 rounded-full" style="background-color: {g.color}"
							></span>
							{g.name}
							<span class="font-normal text-ink-muted">
								· {g.remaining} place{g.remaining > 1 ? 's' : ''} à pourvoir
							</span>
						</h3>
						{#each g.shifts as shift (shift.id)}
							<VolunteerShiftRow
								{shift}
								isLoggedIn={data.isLoggedIn}
								{myId}
								{form}
								positionName={shift.positionName}
								positionColor={shift.positionColor}
								showPosition={false}
							/>
						{/each}
					</section>
				{/each}
			</div>
		{/if}
	{:else if !next}
		<p class="mt-6 text-sm text-ink-muted">Aucun créneau à venir.</p>
	{/if}

	<!-- Créneaux passés (masqués par défaut) -->
	{#if split.past.length > 0}
		<section class="mt-8">
			<button
				type="button"
				onclick={() => (showPast = !showPast)}
				class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
			>
				<ChevronDown size={16} class="transition-transform {showPast ? 'rotate-180' : ''}" />
				{showPast ? 'Masquer' : 'Afficher'} les créneaux passés ({split.past.length})
			</button>
			{#if showPast}
				<div class="mt-2 flex flex-col gap-2">
					{#each split.past as shift (shift.id)}
						<VolunteerShiftRow
							{shift}
							isLoggedIn={data.isLoggedIn}
							{myId}
							{form}
							positionName={shift.positionName}
							positionColor={shift.positionColor}
							past
						/>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
{/if}
