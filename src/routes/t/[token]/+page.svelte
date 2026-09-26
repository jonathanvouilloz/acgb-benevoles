<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { toast } from '$lib/toast.svelte';
	import { confirmAction } from '$lib/confirm.svelte';
	import { Input } from '$lib/components/ui/input';
	import VolunteerShiftRow from '$lib/components/tournament/VolunteerShiftRow.svelte';
	import TimeRangeSlider from '$lib/components/tournament/TimeRangeSlider.svelte';
	import { Modal } from '$lib/components/ui/modal';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { formatDateRange, formatDay, formatTimeRange } from '$lib/format';
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
	import { findConflicts, type BusyShift } from '$lib/overlap';
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
		Info,
		TriangleAlert,
		SlidersHorizontal,
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

	/**
	 * Agenda occupé du bénévole : ses créneaux de CE tournoi + ceux des autres tournois
	 * (chargés par le serveur). Sert à signaler les chevauchements avant inscription.
	 */
	const busy = $derived<BusyShift[]>([
		...upcoming
			.filter((s) => s.myStatus !== null)
			.map((s) => ({
				shiftId: s.id,
				startsAt: s.startsAt,
				endsAt: s.endsAt,
				status: s.myStatus!,
				positionName: s.positionName,
				tournamentName: null
			})),
		...data.myOtherShifts
	]);

	/** Créneaux déjà pris qui recouvrent celui-ci (vide si aucun conflit). */
	function conflictsFor(s: { id: string; startsAt: Date; endsAt: Date }) {
		return findConflicts(s, busy);
	}

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

	// --- Intention d'inscription portée par l'URL (`?prendre=<shiftId>[&statut=maybe]`) ---
	// Posée par les boutons « Dispo » / « Peut-être » d'un visiteur non connecté (cf.
	// VolunteerShiftRow) et conservée à travers le magic link : au retour, on inscrit d'office.
	// Lue une seule fois au montage (non réactive) : on nettoie l'URL juste après.
	const intentShiftId = page.url.searchParams.get('prendre');
	const intentStatus: 'available' | 'maybe' =
		page.url.searchParams.get('statut') === 'maybe' ? 'maybe' : 'available';
	const intentShift = $derived(
		intentShiftId ? (upcoming.find((s) => s.id === intentShiftId) ?? null) : null
	);
	let intentForm = $state<HTMLFormElement | null>(null);
	let intentHandled = false;
	// Le routeur n'est prêt qu'après la navigation initiale : `replaceState` et `enhance`
	// échouent s'ils partent pendant l'hydratation (arrivée directe depuis le magic link).
	let routerReady = $state(false);
	afterNavigate(() => {
		routerReady = true;
	});

	/** Retire `prendre`/`statut` de l'URL (un rechargement ne doit pas réinscrire). */
	function clearIntentParams() {
		replaceState(resolve('/t/[token]', { token: t.shareToken }), {});
	}

	async function runIntent() {
		clearIntentParams();
		const shift = intentShift;
		if (!shift) {
			toast.error("Ce créneau n'est plus disponible.");
			return;
		}
		if (shift.myStatus !== null) {
			tab = 'mine';
			return;
		}
		if (intentStatus === 'available' && shift.isFull) {
			toast.error('Ce créneau est complet entre-temps. Choisis-en un autre.');
			tab = 'browse';
			return;
		}
		const conflicts = conflictsFor(shift);
		if (conflicts.length > 0) {
			const list = conflicts
				.map(
					(c) =>
						`${c.positionName} — ${formatDay(c.startsAt)} · ${formatTimeRange(c.startsAt, c.endsAt)}`
				)
				.join(' · ');
			const ok = await confirmAction({
				title: 'Ce créneau en chevauche un autre',
				message: `Tu es déjà pris sur : ${list}. T'inscrire quand même ?`,
				confirmLabel: "M'inscrire quand même"
			});
			if (!ok) {
				tab = 'browse';
				return;
			}
		}
		intentForm?.requestSubmit();
	}

	// Déclenche dès que l'inscription est possible : connecté, téléphone renseigné (sinon on
	// attend la saisie dans la bannière, puis on reprend automatiquement).
	$effect(() => {
		if (
			intentHandled ||
			!routerReady ||
			!intentShiftId ||
			!data.isLoggedIn ||
			data.needsPhone ||
			!intentForm
		)
			return;
		intentHandled = true;
		runIntent();
	});

	// --- État des filtres (onglet « S'inscrire ») ---
	let day = $state<string | null>(null);
	// Plage horaire en minutes depuis minuit ; null = pas encore touchée (toute la journée).
	let winStart = $state<number | null>(null);
	let winEnd = $state<number | null>(null);
	let selectedPositions = $state<string[]>([]);
	let onlyAvailable = $state(false);
	// Groupement par poste par défaut (retour Anne 2026-08-19) : un bénévole cherche « la buvette »,
	// pas « 10h00 ». Le toggle « Par horaire » reste disponible.
	let groupBy = $state<'time' | 'position'>('position');
	let showPast = $state(false);
	let savingPhone = $state(false);

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

	/** Filtres rangés dans le sheet (plage, postes) : pastille du bouton « Filtres ». */
	const sheetFilterCount = $derived(
		(windowActive ? 1 : 0) + (selectedPositions.length > 0 ? 1 : 0)
	);
	const anyFilter = $derived(day !== null || onlyAvailable || sheetFilterCount > 0);
	let filtersOpen = $state(false);

	function togglePosition(id: string) {
		selectedPositions = selectedPositions.includes(id)
			? selectedPositions.filter((p) => p !== id)
			: [...selectedPositions, id];
	}

	function resetSheetFilters() {
		resetWindow();
		selectedPositions = [];
	}

	function resetFilters() {
		day = null;
		onlyAvailable = false;
		resetSheetFilters();
	}

	const chipBase =
		'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors';
	const chipOn = 'border-brand-primary bg-brand-primary text-white';
	const chipOff = 'border-border text-ink hover:bg-surface-muted';
</script>

<svelte:head><title>{t.name} — Bénévoles ACGB</title></svelte:head>

<header class="flex flex-col gap-1">
	<h1 class="h1">{t.name}</h1>
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

{#if data.needsPhone}
	<!-- Étape bloquante → tout en haut, avant contact et consignes. Téléphone saisi ici même :
	     /compte est bloqué par le gate PWA sur mobile, et le bénévole doit rester sur son tournoi
	     (et garder son intention d'inscription). -->
	<form
		method="POST"
		action="?/savePhone"
		class="mt-4 flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4"
		use:enhance={() => {
			savingPhone = true;
			return async ({ update, result }) => {
				await update({ reset: false });
				savingPhone = false;
				if (result.type === 'success') toast.success('Téléphone enregistré');
			};
		}}
	>
		<label for="phone" class="text-sm text-ink">
			{#if intentShift}
				Dernière étape : ajoute ton numéro pour confirmer ton inscription (au cas où l'organisateur
				doit te joindre).
			{:else}
				Ajoute ton numéro de téléphone pour pouvoir t'inscrire (au cas où l'organisateur doit te
				joindre).
			{/if}
		</label>
		<div class="flex gap-2">
			<Input
				id="phone"
				name="phone"
				type="tel"
				autocomplete="tel"
				inputmode="tel"
				placeholder="+41 79 123 45 67"
				value={form && 'phone' in form ? form.phone : ''}
				class="flex-1 text-base sm:text-sm"
			/>
			<Button type="submit" size="sm" variant="secondary" disabled={savingPhone}>
				<Phone size={16} />
				{savingPhone ? 'Envoi…' : 'Enregistrer'}
			</Button>
		</div>
		{#if form && 'phoneError' in form && form.phoneError}
			<p class="text-xs text-error">{form.phoneError}</p>
		{/if}
	</form>
{/if}

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
	<h2 class="flex items-center gap-1.5 h2">
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

{#if !t.published}
	<!-- Le lien de partage reste actif sur un brouillon (c'est ce qui permet de tester à
	     quelques-uns), mais il faut dire clairement que le tournoi n'est pas encore ouvert. -->
	<section class="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
		<p class="flex items-start gap-1.5 text-sm text-ink">
			<TriangleAlert size={15} class="mt-0.5 shrink-0 text-warning" />
			<span>
				<span class="font-medium">Brouillon.</span> Ce tournoi n'est pas encore publié : il n'apparaît
				pas dans la liste des tournois. Tu peux t'inscrire, mais l'organisateur peut encore tout modifier.
			</span>
		</p>
	</section>
{/if}

{#if t.instructions}
	<!-- Consignes de l'organisateur — texte brut saisi côté gestion, retours à la ligne conservés. -->
	<section class="mt-4 rounded-lg border border-info/40 bg-info/10 p-4">
		<h2 class="flex items-center gap-1.5 h2">
			<Info size={15} /> À savoir avant de t'inscrire
		</h2>
		<p class="mt-2 whitespace-pre-line text-sm text-ink">{t.instructions}</p>
	</section>
{/if}

{#if !data.isLoggedIn}
	<div
		class="mt-4 flex flex-col gap-3 rounded-lg border border-info/40 bg-info/10 p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<p class="text-sm text-ink">
			Choisis un créneau et appuie sur <span class="font-medium">Je prends</span> : on te demande ton
			email, puis ton inscription est enregistrée.
		</p>
		<a href="{resolve('/login')}?redirect={encodeURIComponent(page.url.pathname)}">
			<Button size="sm" variant="ghost" class="w-full sm:w-auto"
				><LogIn size={16} /> Déjà un compte ? Se connecter</Button
			>
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
						<h3 class="h3">
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
								positionDescription={shift.positionDescription}
								showDay={false}
								featured={shift.id === next?.id}
								conflicts={conflictsFor(shift)}
							/>
						{/each}
					</section>
				{/each}
			</div>
		{/if}
	{:else if base.length > 0}
		<!-- Barre de filtres collante, deux lignes courtes : les jours, puis « Places libres » (le
		     filtre le plus concret, en accès direct) et « Filtres » (plage horaire, postes → sheet).
		     L'ancienne barre complète mangeait ~40 % de l'écran mobile. -->
		<section
			class="sticky top-0 z-10 -mx-4 mt-6 flex flex-col gap-2 border-b border-border bg-surface px-4 py-2"
		>
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
			<div class="flex items-center justify-between gap-3">
				<Switch bind:checked={onlyAvailable} label="Places libres" />
				<!-- Forme (coins carrés) et teinte propres : ne se confond pas avec une date. -->
				<button
					class="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded border px-3 text-sm font-medium whitespace-nowrap transition-colors {sheetFilterCount >
					0
						? 'border-brand-primary bg-brand-primary text-white'
						: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15'}"
					onclick={() => (filtersOpen = true)}
				>
					<SlidersHorizontal size={14} /> Filtres
					{#if sheetFilterCount > 0}
						<span
							class="inline-flex size-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-primary"
							>{sheetFilterCount}</span
						>
					{:else}
						<span class="text-xs font-normal opacity-80">· horaire, postes</span>
					{/if}
				</button>
			</div>
		</section>

		<!-- Compteur (hors barre collante) -->
		<div class="mt-3 flex items-center justify-between gap-2">
			<p class="text-xs text-ink-muted">
				{filtered.length} créneau{filtered.length > 1 ? 'x' : ''} · {remaining} place{remaining > 1
					? 's'
					: ''} à pourvoir
			</p>
			{#if anyFilter}
				<button
					onclick={resetFilters}
					class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
				>
					<X size={12} /> Réinitialiser
				</button>
			{/if}
		</div>

		<Modal bind:open={filtersOpen} title="Filtres" variant="sheet">
			<div class="flex flex-col gap-5">
				<!-- Plage horaire : curseur à deux poignées + histogramme des besoins -->
				{#if bounds.max - bounds.min >= 2}
					<div class="flex flex-col gap-1">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-ink">Quand peux-tu aider ?</span>
							{#if windowActive}
								<button
									onclick={resetWindow}
									class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
								>
									<X size={12} /> Toute la journée
								</button>
							{/if}
						</div>
						<!-- px : les poignées débordent de leur rayon aux extrémités (sinon scroll horizontal). -->
						<div class="px-2.5">
							<TimeRangeSlider
								min={bounds.min * 60}
								max={bounds.max * 60}
								start={effStart}
								end={effEnd}
								{density}
								onchange={onWindowChange}
							/>
						</div>
					</div>
				{/if}

				<!-- Postes : chips à bascule (aucun = tous) -->
				{#if positionChips.length > 1}
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-ink">Postes</span>
						<div class="flex flex-wrap gap-1.5">
							{#each positionChips as p (p.id)}
								{@const on = selectedPositions.includes(p.id)}
								<button
									class="{chipBase} {on ? chipOn : chipOff}"
									aria-pressed={on}
									onclick={() => togglePosition(p.id)}
								>
									<span
										class="size-2 shrink-0 rounded-full {on ? 'ring-1 ring-white' : ''}"
										style="background-color: {p.color}"
									></span>
									{p.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Regroupement -->
				<div class="flex items-center justify-between gap-2">
					<span class="text-sm font-medium text-ink">Afficher par</span>
					<div class="flex items-center gap-1 rounded-full border border-border p-0.5">
						<button
							class="inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-sm font-medium transition-colors {groupBy ===
							'position'
								? 'bg-brand-primary text-white'
								: 'text-ink-muted hover:text-ink'}"
							onclick={() => (groupBy = 'position')}
						>
							<LayoutGrid size={14} /> Poste
						</button>
						<button
							class="inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-sm font-medium transition-colors {groupBy ===
							'time'
								? 'bg-brand-primary text-white'
								: 'text-ink-muted hover:text-ink'}"
							onclick={() => (groupBy = 'time')}
						>
							<Clock size={14} /> Horaire
						</button>
					</div>
				</div>
			</div>

			{#snippet footer()}
				<div class="flex items-center justify-between gap-3">
					<button
						onclick={resetSheetFilters}
						disabled={sheetFilterCount === 0}
						class="text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-40"
					>
						Réinitialiser
					</button>
					<Button onclick={() => (filtersOpen = false)}>
						Voir {filtered.length} créneau{filtered.length > 1 ? 'x' : ''}
					</Button>
				</div>
			{/snippet}
		</Modal>

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
						<h3 class="h3">
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
								positionDescription={shift.positionDescription}
								showDay={false}
								conflicts={conflictsFor(shift)}
							/>
						{/each}
					</section>
				{/each}
			</div>
		{:else}
			<div class="mt-4 flex flex-col gap-5">
				{#each positionGroups as g (g.id)}
					<section class="flex flex-col gap-2">
						<h3 class="flex items-center gap-1.5 h3">
							<span class="size-2.5 shrink-0 rounded-full" style="background-color: {g.color}"
							></span>
							{g.name}
							<span class="font-normal text-ink-muted">
								· {g.remaining} place{g.remaining > 1 ? 's' : ''} à pourvoir
							</span>
						</h3>
						{#if g.description}
							<!-- Consigne du poste : le bénévole doit savoir à quoi il s'engage AVANT de cliquer
							     (retour Anne 2026-08-19 — elle la saisissait sans qu'elle soit jamais affichée). -->
							<p class="-mt-1 text-sm whitespace-pre-line text-ink-muted">{g.description}</p>
						{/if}
						{#each g.shifts as shift (shift.id)}
							<VolunteerShiftRow
								{shift}
								isLoggedIn={data.isLoggedIn}
								{myId}
								{form}
								positionName={shift.positionName}
								positionColor={shift.positionColor}
								showPosition={false}
								conflicts={conflictsFor(shift)}
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

{#if intentShiftId && data.isLoggedIn}
	<!-- Soumission automatique de l'intention d'inscription (cf. runIntent). -->
	<form
		bind:this={intentForm}
		method="POST"
		action="?/signup"
		class="hidden"
		use:enhance={() =>
			async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					toast.success(
						intentStatus === 'maybe'
							? 'Noté : peut-être disponible'
							: "C'est noté, ce créneau est à toi"
					);
					tab = 'mine';
				} else if (result.type === 'failure') {
					toast.error(String(result.data?.formError ?? "L'inscription n'a pas abouti."));
					tab = 'browse';
				}
			}}
	>
		<input type="hidden" name="shiftId" value={intentShiftId} />
		<input type="hidden" name="status" value={intentStatus} />
	</form>
{/if}
