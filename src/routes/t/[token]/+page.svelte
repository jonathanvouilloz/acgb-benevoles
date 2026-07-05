<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import VolunteerShiftRow from '$lib/components/tournament/VolunteerShiftRow.svelte';
	import TimeRangeSlider from '$lib/components/tournament/TimeRangeSlider.svelte';
	import PositionMultiSelect from '$lib/components/tournament/PositionMultiSelect.svelte';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { formatDateRange } from '$lib/format';
	import {
		flattenShifts,
		splitByTime,
		nextOwnShift,
		filterShifts,
		groupByTime,
		groupByPosition,
		distinctDays,
		presentPositionIds,
		totalRemaining,
		shiftHourBounds,
		needDensity
	} from '$lib/volunteer-shifts';
	import {
		CalendarDays,
		MapPin,
		LogIn,
		Star,
		ListPlus,
		ChevronDown,
		User,
		Mail,
		Phone,
		Clock,
		LayoutGrid,
		Settings,
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

	// --- Onglets : « Mes créneaux » (agenda perso) vs « S'inscrire » (liste ouverte) ---
	const myCount = $derived(upcoming.filter((s) => s.myStatus !== null).length);
	// Défaut : si déjà inscrit → « Mes créneaux », sinon → « S'inscrire ».
	// svelte-ignore state_referenced_locally
	let tab = $state<'mine' | 'browse'>(myCount > 0 ? 'mine' : 'browse');
	// Le composant est réutilisé en naviguant entre tournois : on réinitialise l'onglet au défaut.
	// svelte-ignore state_referenced_locally
	let lastTournamentId = $state(t.id);
	$effect(() => {
		if (t.id !== lastTournamentId) {
			lastTournamentId = t.id;
			tab = myCount > 0 ? 'mine' : 'browse';
		}
	});

	/** Agenda perso : mes créneaux à venir, regroupés par temps (le 1ᵉʳ = prochain, mis en avant). */
	const myUpcoming = $derived(upcoming.filter((s) => s.myStatus !== null));
	const myTimeGroups = $derived(groupByTime(myUpcoming));
	/** Créneaux passés affichés : seulement les miens en onglet « Mes créneaux », sinon tous. */
	const pastShifts = $derived(
		tab === 'mine' ? split.past.filter((s) => s.myStatus !== null) : split.past
	);

	// --- État des filtres (onglet « S'inscrire ») ---
	let day = $state<string | null>(null);
	// Plage horaire en minutes depuis minuit ; null = pas encore touchée (toute la journée).
	let winStart = $state<number | null>(null);
	let winEnd = $state<number | null>(null);
	let selectedPositions = $state<string[]>([]);
	let onlyAvailable = $state(false);
	let groupBy = $state<'time' | 'position'>('time');
	let showPast = $state(false);

	/** Base de la liste d'inscription : tous les créneaux à venir. */
	const base = $derived(upcoming);

	// Options de filtres calculées d'après les créneaux réellement présents.
	const dayOpts = $derived(distinctDays(upcoming));
	const posPresent = $derived(presentPositionIds(upcoming));
	const positionChips = $derived(t.positions.filter((p) => posPresent.has(p.id)));

	// Curseur de plage : bornes en heures pleines → minutes ; fenêtre active si resserrée.
	const bounds = $derived(shiftHourBounds(base));
	const effStart = $derived(winStart ?? bounds.min * 60);
	const effEnd = $derived(winEnd ?? bounds.max * 60);
	const windowActive = $derived(effStart > bounds.min * 60 || effEnd < bounds.max * 60);
	const windowFilter = $derived(windowActive ? { start: effStart, end: effEnd } : null);

	// Histogramme des besoins : densité (jour + postes sélectionnés), indépendante de la plage.
	const densityBase = $derived(
		filterShifts(base, {
			day,
			window: null,
			positionIds: selectedPositions,
			onlyAvailable: false,
			onlyMine: false
		})
	);
	const density = $derived(needDensity(densityBase, bounds.min, bounds.max));

	const filtered = $derived(
		filterShifts(base, {
			day,
			window: windowFilter,
			positionIds: selectedPositions,
			onlyAvailable,
			onlyMine: false
		})
	);
	const remaining = $derived(totalRemaining(filtered));
	const timeGroups = $derived(groupByTime(filtered));
	const positionGroups = $derived(groupByPosition(filtered, t.positions));

	function resetWindow() {
		winStart = null;
		winEnd = null;
	}

	function onWindowChange(s: number, e: number) {
		winStart = s;
		winEnd = e;
	}

	function resetFilters() {
		day = null;
		resetWindow();
		selectedPositions = [];
		onlyAvailable = false;
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

{#if t.isOwner}
	<!-- Raccourci gestion : cette page est le lien de partage public, mais l'organisateur y arrive
	     parfois directement — on lui offre un accès explicite à sa page de gestion. -->
	<section
		class="mt-4 flex flex-col gap-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<p class="flex items-center gap-2 text-sm text-ink">
			<Settings size={16} class="shrink-0 text-brand-primary" />
			<span>Tu organises ce tournoi.</span>
		</p>
		<a href={resolve('/tournois/[id]', { id: t.id })} class="shrink-0">
			<Button size="sm" class="w-full sm:w-auto"><Settings size={16} /> Gérer ce tournoi</Button>
		</a>
	</section>
{/if}

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
	<!-- Onglets : « Mes créneaux » (agenda perso) / « S'inscrire » (liste ouverte) -->
	{#if data.isLoggedIn}
		<div class="mt-6 flex items-center gap-1 rounded-full border border-border p-0.5">
			<button
				class="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors {tab ===
				'mine'
					? 'bg-brand-primary text-white'
					: 'text-ink-muted hover:text-ink'}"
				onclick={() => (tab = 'mine')}
			>
				<Star size={15} /> Mes créneaux{#if myCount > 0}&nbsp;({myCount}){/if}
			</button>
			<button
				class="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors {tab ===
				'browse'
					? 'bg-brand-primary text-white'
					: 'text-ink-muted hover:text-ink'}"
				onclick={() => (tab = 'browse')}
			>
				<ListPlus size={15} /> S'inscrire
			</button>
		</div>
	{/if}

	{#if data.isLoggedIn && tab === 'mine'}
		<!-- Agenda perso : mes créneaux triés par horaire, le prochain mis en avant -->
		{#if myUpcoming.length === 0}
			<div
				class="mt-6 flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-10"
			>
				<p class="text-sm text-ink-muted">Tu n'es inscrit à aucun créneau pour ce tournoi.</p>
				<Button size="sm" onclick={() => (tab = 'browse')}>
					<ListPlus size={16} /> Voir les créneaux à pourvoir
				</Button>
			</div>
		{:else}
			<div class="mt-4 flex flex-col gap-5">
				{#each myTimeGroups as g (g.key)}
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
								featured={shift.id === next?.id}
							/>
						{/each}
					</section>
				{/each}
			</div>
		{/if}
	{:else if base.length > 0}
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

			<!-- Plage horaire : curseur à deux poignées + histogramme des besoins -->
			{#if bounds.max - bounds.min >= 2}
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-ink-muted">Quand peux-tu aider ?</span>
						{#if windowActive}
							<button
								onclick={resetWindow}
								class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
							>
								<X size={12} /> Toute la journée
							</button>
						{/if}
					</div>
					<TimeRangeSlider
						min={bounds.min * 60}
						max={bounds.max * 60}
						start={effStart}
						end={effEnd}
						{density}
						onchange={onWindowChange}
					/>
				</div>
			{/if}

			<!-- Bascules (switch) à gauche, multi-select des postes aligné à droite -->
			<div class="flex items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
					<Switch bind:checked={onlyAvailable} label="Places dispo" />
				</div>
				{#if positionChips.length > 1}
					<PositionMultiSelect positions={positionChips} bind:selected={selectedPositions} />
				{/if}
			</div>

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
	{:else}
		<p class="mt-6 text-sm text-ink-muted">Aucun créneau à venir.</p>
	{/if}

	<!-- Créneaux passés (masqués par défaut) — restreints aux miens en onglet « Mes créneaux » -->
	{#if pastShifts.length > 0}
		<section class="mt-8">
			<button
				type="button"
				onclick={() => (showPast = !showPast)}
				class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
			>
				<ChevronDown size={16} class="transition-transform {showPast ? 'rotate-180' : ''}" />
				{showPast ? 'Masquer' : 'Afficher'} les créneaux passés ({pastShifts.length})
			</button>
			{#if showPast}
				<div class="mt-2 flex flex-col gap-2">
					{#each pastShifts as shift (shift.id)}
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
