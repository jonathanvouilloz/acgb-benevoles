<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import VolunteerShiftRow from '$lib/components/tournament/VolunteerShiftRow.svelte';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateRange } from '$lib/format';
	import { flattenShifts, splitByTime, nextOwnShift } from '$lib/volunteer-shifts';
	import { CalendarDays, MapPin, LogIn, Star, ChevronDown, User, Mail, Phone } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const t = $derived(data.tournament);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
	const myId = $derived(data.me?.id ?? null);

	// `now` côté client : on l'initialise au montage pour éviter tout décalage SSR.
	let now = $state(Date.now());

	const all = $derived(flattenShifts(t));
	const split = $derived(splitByTime(all, now));
	const next = $derived(nextOwnShift(split.upcoming));
	/** Les créneaux à venir hors celui mis en avant (évite le doublon). */
	const upcomingRest = $derived(split.upcoming.filter((s) => s.id !== next?.id));

	let showPast = $state(false);
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
		<a href={loginHref}>
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

	<!-- Créneaux à venir (chronologique, tous postes) -->
	<section class="mt-6 flex flex-col gap-2">
		{#if upcomingRest.length > 0}
			<h2 class="text-sm font-semibold text-ink-strong">
				{next ? 'Autres créneaux' : 'Créneaux'}
			</h2>
			{#each upcomingRest as shift (shift.id)}
				<VolunteerShiftRow
					{shift}
					isLoggedIn={data.isLoggedIn}
					{myId}
					{form}
					positionName={shift.positionName}
					positionColor={shift.positionColor}
				/>
			{/each}
		{:else if !next}
			<p class="text-sm text-ink-muted">Aucun créneau à venir.</p>
		{/if}
	</section>

	<!-- Créneaux passés (masqués par défaut) -->
	{#if split.past.length > 0}
		<section class="mt-6">
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
