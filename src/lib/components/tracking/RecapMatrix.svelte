<script lang="ts">
	import { Popover } from 'bits-ui';
	import { formatDay, formatTime } from '$lib/format';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import type { AssignRequest, CellRef, ShiftRef } from './assignment-types';
	import {
		Check,
		CircleHelp,
		Pencil,
		Phone,
		ArrowLeftRight,
		X,
		Eye,
		UserMinus,
		UserPlus,
		Mail,
		TriangleAlert
	} from 'lucide-svelte';

	let {
		tournament,
		positionId = 'all',
		day = 'all',
		volunteerIds = null,
		statusFilter = 'all',
		interactive = false,
		onAssign,
		onAttachEmail,
		onEditVolunteer
	}: {
		tournament: VolunteerTournament;
		positionId?: string;
		day?: string;
		/** Restreint les lignes aux bénévoles dont l'id est dans le set (recherche). `null` = tous. */
		volunteerIds?: Set<string> | null;
		/** Filtre l'affichage des cellules : 'available' | 'maybe' n'affichent que ce statut. */
		statusFilter?: string;
		/** Active la sélection de cellules pour échanger / déplacer (organisateur). */
		interactive?: boolean;
		onAssign?: (req: AssignRequest) => void;
		/** Rattacher un vrai email à une fiche sans email (la rend connectable). */
		onAttachEmail?: (v: { userId: string; name: string }) => void;
		onEditVolunteer?: (v: {
			userId: string;
			name: string;
			phone: string | null;
			isManaged: boolean;
		}) => void;
	} = $props();

	type Cell = 'available' | 'maybe' | null;
	/** Un créneau du bénévole (pour la carte « infos bénévole » au clic sur son nom). */
	type Assignment = {
		positionName: string;
		color: string;
		dayLabel: string;
		timeLabel: string;
		status: 'available' | 'maybe';
		note: string | null;
	};
	type Volunteer = {
		id: string;
		name: string;
		phone: string | null;
		/** Fiche créée par un organisateur, sans email : ne se connecte pas, n'est jamais notifiée. */
		isManaged: boolean;
		/** Fiche créée par l'organisateur qui regarde : lui seul peut la corriger (Epic 15). */
		isEditable: boolean;
		assignments: Assignment[];
	};
	type MatrixShift = {
		id: string;
		startsAt: Date;
		endsAt: Date;
		capacity: number;
		availableCount: number;
		remaining: number;
		isFull: boolean;
	};
	type Group = { name: string; color: string; shifts: MatrixShift[] };

	// L'édition n'est proposée que sans filtre de statut (sinon des cellules masquées
	// fausseraient la lecture « occupé / vide »).
	const editable = $derived(interactive && statusFilter === 'all');

	let selected = $state<CellRef | null>(null);

	// Popover de consultation, ancré sur la cellule cliquée. Deux contenus :
	//  - 'cell'      : clic sur une cellule occupée → statut/créneau/note + action d'échange.
	//  - 'volunteer' : clic sur le nom (en-tête de ligne) → carte contact (tél + ses créneaux).
	//  - 'empty'     : clic sur une cellule VIDE d'un bénévole déjà en ligne → inscription directe.
	type Inspect =
		| { kind: 'cell'; ref: CellRef; phone: string | null; note: string | null }
		| {
				kind: 'volunteer';
				userId: string;
				name: string;
				phone: string | null;
				isManaged: boolean;
				isEditable: boolean;
				assignments: Assignment[];
		  }
		| { kind: 'empty'; volunteer: Volunteer; target: ShiftRef };
	let inspect = $state<Inspect | null>(null);
	let inspectAnchor = $state<HTMLElement | null>(null);
	let inspectOpen = $state(false);

	// Réinitialise sélection et popover si la matrice change de contenu (filtres, données).
	$effect(() => {
		void matrix;
		selected = null;
		inspectOpen = false;
	});

	function timeLabel(s: MatrixShift): string {
		return `${formatTime(s.startsAt)}–${formatTime(s.endsAt)}`;
	}
	function makeCellRef(
		v: { id: string; name: string },
		g: Group,
		s: MatrixShift,
		status: 'available' | 'maybe'
	): CellRef {
		return {
			userId: v.id,
			name: v.name,
			shiftId: s.id,
			positionName: g.name,
			dayLabel: formatDay(s.startsAt),
			timeLabel: timeLabel(s),
			status
		};
	}
	function makeShiftRef(g: Group, s: MatrixShift): ShiftRef {
		return {
			shiftId: s.id,
			positionName: g.name,
			dayLabel: formatDay(s.startsAt),
			timeLabel: timeLabel(s),
			remaining: s.remaining,
			capacity: s.capacity
		};
	}
	function isSelected(v: { id: string }, s: MatrixShift): boolean {
		return !!selected && selected.userId === v.id && selected.shiftId === s.id;
	}

	function clickCell(e: MouseEvent, v: Volunteer, g: Group, s: MatrixShift, status: Cell) {
		if (!interactive) return;

		// Mode édition ARMÉ (une cellule a été sélectionnée via le popover) : le clic exécute
		// l'échange / le déplacement. Le popover ne s'ouvre pas dans ce mode.
		if (selected) {
			if (selected.userId === v.id && selected.shiftId === s.id) {
				selected = null;
				return;
			}
			if (status) {
				// Cellule occupée. Même bénévole, ou même créneau (échange sans effet) → re-sélection.
				if (v.id === selected.userId || s.id === selected.shiftId) {
					selected = makeCellRef(v, g, s, status);
					return;
				}
				const req: AssignRequest = { type: 'swap', a: selected, b: makeCellRef(v, g, s, status) };
				selected = null;
				onAssign?.(req);
			} else {
				// Cellule vide : déplacement du bénévole sélectionné vers ce créneau.
				const alreadyHere =
					s.id === selected.shiftId || matrix.lookup.has(`${selected.userId}:${s.id}`);
				if (alreadyHere) {
					selected = null;
					return;
				}
				const req: AssignRequest = { type: 'move', from: selected, target: makeShiftRef(g, s) };
				selected = null;
				onAssign?.(req);
			}
			return;
		}

		// Rien d'armé : clic sur une cellule OCCUPÉE → popover de consultation (tél, note, action).
		if (status) {
			inspect = {
				kind: 'cell',
				ref: makeCellRef(v, g, s, status),
				phone: v.phone,
				note: matrix.notes.get(`${v.id}:${s.id}`) ?? null
			};
			inspectAnchor = e.currentTarget as HTMLElement;
			inspectOpen = true;
			return;
		}

		// Rien d'armé, cellule VIDE d'un bénévole déjà présent en ligne → inscription en 2 clics.
		// Ce cas ne faisait rien auparavant ; il n'interfère pas avec le mode armé, traité plus haut.
		if (editable) {
			inspect = { kind: 'empty', volunteer: v, target: makeShiftRef(g, s) };
			inspectAnchor = e.currentTarget as HTMLElement;
			inspectOpen = true;
		}
	}

	/** Clic sur le nom (en-tête de ligne) → carte contact du bénévole (tél + ses créneaux). */
	function clickName(e: MouseEvent, v: Volunteer) {
		if (!interactive) return;
		inspect = {
			kind: 'volunteer',
			userId: v.id,
			name: v.name,
			phone: v.phone,
			isManaged: v.isManaged,
			isEditable: v.isEditable,
			assignments: v.assignments
		};
		inspectAnchor = e.currentTarget as HTMLElement;
		inspectOpen = true;
	}

	/** Depuis le popover de cellule : demande le retrait du bénévole de ce créneau. */
	function removeFromInspect() {
		if (inspect?.kind !== 'cell') return;
		const ref = inspect.ref;
		inspectOpen = false;
		onAssign?.({ type: 'remove', cell: ref });
	}

	/** Depuis le popover de cellule vide : inscrit ce bénévole sur ce créneau. */
	function assignFromInspect() {
		if (inspect?.kind !== 'empty') return;
		const { volunteer, target } = inspect;
		inspectOpen = false;
		onAssign?.({
			type: 'assign',
			target,
			volunteer: { userId: volunteer.id, name: volunteer.name }
		});
	}

	/** Depuis la ligne « À pourvoir » : ouvre l'inscription avec le créneau pré-sélectionné. */
	function assignToShift(g: Group, s: MatrixShift) {
		if (!editable) return;
		onAssign?.({ type: 'assign', target: makeShiftRef(g, s) });
	}

	/** Depuis la carte contact : rattacher un vrai email à une fiche (la rend connectable). */
	function attachEmailFromInspect() {
		if (inspect?.kind !== 'volunteer') return;
		const { userId, name } = inspect;
		inspectOpen = false;
		onAttachEmail?.({ userId, name });
	}

	/** Depuis la carte contact : corriger la fiche (nom, tél, email) d'un bénévole qu'on a créé. */
	function editVolunteerFromInspect() {
		if (inspect?.kind !== 'volunteer') return;
		const { userId, name, phone, isManaged } = inspect;
		inspectOpen = false;
		onEditVolunteer?.({ userId, name, phone, isManaged });
	}

	/** Depuis le popover de cellule : arme la sélection pour échanger / déplacer ce bénévole. */
	function armFromInspect() {
		if (inspect?.kind !== 'cell') return;
		selected = inspect.ref;
		inspectOpen = false;
	}

	const matrix = $derived.by(() => {
		// Bénévoles uniques (ordre d'apparition), colonnes = créneaux groupés par poste.
		const volunteers = new Map<
			string,
			{
				name: string;
				phone: string | null;
				isManaged: boolean;
				isEditable: boolean;
				assignments: Assignment[];
			}
		>();
		const lookup = new Map<string, Cell>();
		const notes = new Map<string, string>();
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
					if (volunteerIds && !volunteerIds.has(su.userId)) continue;
					if (!volunteers.has(su.userId))
						volunteers.set(su.userId, {
							name: su.name,
							phone: su.phone,
							isManaged: su.isManaged,
							isEditable: su.isEditable,
							assignments: []
						});
					volunteers.get(su.userId)!.assignments.push({
						positionName: p.name,
						color: p.color,
						dayLabel: formatDay(s.startsAt),
						timeLabel: `${formatTime(s.startsAt)}–${formatTime(s.endsAt)}`,
						status: su.status,
						note: su.note
					});
					lookup.set(`${su.userId}:${s.id}`, su.status);
					if (su.note) notes.set(`${su.userId}:${s.id}`, su.note);
				}
			}
			if (shifts.length > 0) groups.push({ name: p.name, color: p.color, shifts });
		}
		return {
			volunteers: [...volunteers.entries()].map(([id, val]) => ({ id, ...val })) as Volunteer[],
			groups,
			lookup,
			notes
		};
	});
</script>

<svelte:window
	onkeydown={editable && selected ? (e) => e.key === 'Escape' && (selected = null) : undefined}
/>

<!-- La grille se tient dès qu'il y a des colonnes : sans aucun inscrit, elle montre encore les
     créneaux et la ligne « À pourvoir » — c'est justement là que « il manque tout le monde »
     est l'information la plus utile. Seul un tournoi sans créneau (ou tout filtré) n'a rien à dire. -->
{#if matrix.groups.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucun créneau à afficher.
	</p>
{:else}
	<!-- Légende -->
	<div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
		<span class="inline-flex items-center gap-1.5">
			<span class="flex size-5 items-center justify-center rounded bg-success/15 text-success">
				<Check size={14} strokeWidth={2.75} />
			</span> Disponible
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="flex size-5 items-center justify-center rounded bg-warning/15 text-warning">
				<CircleHelp size={14} strokeWidth={2.75} />
			</span> Peut-être
		</span>
		<span class="inline-flex items-center gap-1.5"
			><span class="text-base text-ink-muted/45">·</span> Non inscrit</span
		>
		<span class="inline-flex items-center gap-1">
			<span class="inline-block rounded bg-warning/12 px-1.5 font-semibold text-warning">X/Y</span>
			places pourvues
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="size-1.5 rounded-full bg-warning"></span> note (clic ou survol)
		</span>
	</div>

	{#if matrix.volunteers.length === 0}
		<p class="mb-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-ink">
			Aucune inscription pour le moment — toutes les places sont à pourvoir.
		</p>
	{/if}

	{#if editable && matrix.volunteers.length > 0}
		<div
			class="mb-2 flex items-center gap-1.5 rounded-md border border-brand-primary/30 bg-brand-primary/5 px-3 py-1.5 text-xs text-ink"
		>
			<Pencil size={13} class="shrink-0 text-brand-primary" />
			{#if selected}
				<span
					><strong>{selected.name}</strong> sélectionné·e — cliquez une autre cellule pour échanger,
					ou une cellule vide pour déplacer. <kbd>Échap</kbd> pour annuler.</span
				>
			{:else}
				Cliquez une cellule pour voir le bénévole (tél, note) et, si besoin, l'échanger ou le
				déplacer.
			{/if}
		</div>
	{/if}

	{#snippet cellContent(cell: Cell)}
		{#if cell === 'available'}
			<span
				class="mx-auto flex size-7 items-center justify-center rounded-md bg-success/15 text-success"
			>
				<Check size={20} strokeWidth={2.75} />
			</span>
		{:else if cell === 'maybe'}
			<span
				class="mx-auto flex size-7 items-center justify-center rounded-md bg-warning/15 text-warning"
			>
				<CircleHelp size={20} strokeWidth={2.75} />
			</span>
		{:else}
			<span class="text-base text-ink-muted/45">·</span>
		{/if}
	{/snippet}

	<!-- Grille bornée (modèle tableur) : scroll des deux axes À L'INTÉRIEUR du conteneur, donc les
	     barres restent aux bords de l'écran. En-têtes figés en haut, colonne « Bénévole » figée à
	     gauche. `border-separate` : les bordures sont portées par chaque cellule → elles ne
	     disparaissent pas sur les éléments collants (bug connu de `border-collapse` + sticky). -->
	<div class="max-h-[78vh] overflow-auto rounded-lg border border-border">
		<table class="border-separate border-spacing-0 text-sm">
			<thead class="sticky top-0 z-20 bg-surface-subtle">
				<!-- Bandeau postes -->
				<tr class="bg-surface-subtle">
					<th
						rowspan="3"
						class="sticky left-0 z-30 border-b border-r border-border bg-surface-subtle px-3 py-2 text-left font-semibold text-ink-strong"
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
							class="sticky left-0 z-10 border-b border-r border-border bg-surface text-left font-medium text-ink-strong"
						>
							{#if interactive}
								<button
									type="button"
									onclick={(e) => clickName(e, v)}
									class="group flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-surface-muted"
								>
									<span class="truncate">{v.name}</span>
									{#if v.isManaged}
										<!-- Sans ce marqueur, l'organisateur croit que cette personne a reçu son
										     rappel comme les autres. -->
										<span
											title="Ajouté par un organisateur, sans email : ne se connecte pas et ne reçoit aucun rappel."
											class="shrink-0 rounded bg-warning/15 px-1 py-0.5 text-[10px] font-semibold text-warning"
										>
											hors app
										</span>
									{/if}
									<Eye
										size={13}
										class="ml-auto shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
									/>
								</button>
							{:else}
								<span class="block px-3 py-2">{v.name}</span>
							{/if}
						</th>
						{#each matrix.groups as g (g.name)}
							{#each g.shifts as s (s.id)}
								{@const raw = matrix.lookup.get(`${v.id}:${s.id}`)}
								{@const cell =
									(statusFilter === 'available' || statusFilter === 'maybe') && raw !== statusFilter
										? null
										: (raw ?? null)}
								{@const noteText = matrix.notes.get(`${v.id}:${s.id}`)}
								<td
									title={noteText ?? undefined}
									class="relative border-b border-r border-border/60 text-center {interactive
										? 'p-0'
										: 'px-2 py-1.5'}"
								>
									{#if interactive}
										<button
											type="button"
											onclick={(e) => clickCell(e, v, g, s, cell)}
											class="flex w-full items-center justify-center px-2 py-1.5 transition-colors {isSelected(
												v,
												s
											)
												? 'bg-brand-primary/10 ring-2 ring-inset ring-brand-primary'
												: selected
													? 'cursor-pointer hover:bg-brand-primary/5'
													: cell || editable
														? 'cursor-pointer hover:bg-surface-muted'
														: 'cursor-default'}"
										>
											{@render cellContent(cell)}
										</button>
									{:else}
										{@render cellContent(cell)}
									{/if}
									{#if noteText}
										<span
											class="pointer-events-none absolute right-0.5 top-0.5 size-1.5 rounded-full bg-warning"
											aria-hidden="true"
										></span>
									{/if}
								</td>
							{/each}
						{/each}
					</tr>
				{/each}
				<!-- Places encore libres, colonne par colonne. Sans cette ligne, un créneau de 2 places
				     dont 1 est déjà prise ne montrait plus son trou dans la grille. -->
				<tr class="bg-warning/5">
					<th
						class="sticky left-0 z-10 border-t border-r border-border bg-surface-subtle px-3 py-2 text-left text-xs font-semibold text-ink-strong"
					>
						À pourvoir
					</th>
					{#each matrix.groups as g (g.name)}
						{#each g.shifts as s (s.id)}
							<td
								class="border-t border-r border-border/60 text-center {editable && s.remaining > 0
									? 'p-0'
									: 'px-2 py-1.5'}"
							>
								{#if s.remaining > 0}
									{#if editable}
										<!-- La place libre est le point d'entrée naturel de l'inscription :
										     c'est là que l'organisateur regarde quand il lui manque quelqu'un. -->
										<button
											type="button"
											onclick={() => assignToShift(g, s)}
											title="Inscrire un bénévole — {s.remaining} place{s.remaining > 1
												? 's'
												: ''} à pourvoir"
											class="group flex w-full items-center justify-center gap-1 px-2 py-1.5 transition-colors hover:bg-warning/15"
										>
											<span
												class="inline-block rounded bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning"
											>
												+{s.remaining}
											</span>
											<UserPlus
												size={12}
												class="shrink-0 text-warning opacity-0 transition-opacity group-hover:opacity-100"
											/>
										</button>
									{:else}
										<span
											title="{s.remaining} place{s.remaining > 1 ? 's' : ''} encore à pourvoir"
											class="inline-block rounded bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning"
										>
											+{s.remaining}
										</span>
									{/if}
								{:else}
									<span title="Créneau complet" class="text-xs text-success">
										<Check size={14} strokeWidth={2.75} class="mx-auto" />
									</span>
								{/if}
							</td>
						{/each}
					{/each}
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Popover de consultation : ancré sur la cellule cliquée, portalé (échappe au clip du
	     conteneur scrollable). Affiche tél + note + l'action d'échange. -->
	<Popover.Root bind:open={inspectOpen}>
		<Popover.Portal>
			{#if inspect}
				<Popover.Content
					customAnchor={inspectAnchor}
					side="bottom"
					align="start"
					sideOffset={6}
					class="z-50 w-64 rounded-lg border border-border bg-surface p-3 text-sm"
					style="box-shadow: var(--shadow-md)"
				>
					{@const who =
						inspect.kind === 'cell'
							? inspect.ref.name
							: inspect.kind === 'empty'
								? inspect.volunteer.name
								: inspect.name}
					{@const tel = inspect.kind === 'empty' ? inspect.volunteer.phone : inspect.phone}
					<div class="flex items-start justify-between gap-2">
						<p class="font-semibold text-ink-strong">{who}</p>
						<Popover.Close
							aria-label="Fermer"
							class="-mr-1 -mt-1 rounded p-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
						>
							<X size={15} />
						</Popover.Close>
					</div>

					{#if tel}
						<a
							href="tel:{tel}"
							class="mt-1 inline-flex items-center gap-1.5 font-medium text-ink hover:text-brand-primary"
						>
							<Phone size={14} class="shrink-0" />
							{tel}
						</a>
					{:else}
						<p class="mt-1 text-xs text-ink-muted/70">Pas de téléphone renseigné</p>
					{/if}

					{#if inspect.kind === 'empty'}
						<!-- Cellule vide d'un bénévole déjà en ligne : inscription en 2 clics. -->
						<p class="mt-2 text-ink-muted">
							{inspect.target.positionName} · {inspect.target.dayLabel}, {inspect.target.timeLabel}
						</p>
						{#if inspect.target.remaining === 0}
							<p class="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
								<TriangleAlert size={13} class="mt-0.5 shrink-0" />
								<span>Créneau complet — l'inscription ne sera possible qu'en « peut-être ».</span>
							</p>
						{:else}
							<p class="mt-1 text-xs text-ink-muted">
								{inspect.target.remaining} place{(inspect.target.remaining ?? 0) > 1 ? 's' : ''} à pourvoir
							</p>
						{/if}
						<button
							type="button"
							onclick={assignFromInspect}
							class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded border border-brand-primary/40 bg-brand-primary/5 px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/10"
						>
							<UserPlus size={14} /> Inscrire {inspect.volunteer.name} ici
						</button>
					{:else if inspect.kind === 'cell'}
						<!-- Consultation d'un créneau précis (clic cellule) -->
						<p class="mt-2 flex items-center gap-1.5 text-ink-muted">
							{#if inspect.ref.status === 'available'}
								<Check size={14} class="text-success" /> Disponible
							{:else}
								<CircleHelp size={14} class="text-warning" /> Peut-être
							{/if}
						</p>
						<p class="text-ink-muted">
							{inspect.ref.positionName} · {inspect.ref.dayLabel}, {inspect.ref.timeLabel}
						</p>
						{#if inspect.note}
							<p class="mt-1.5 text-ink-muted italic">« {inspect.note} »</p>
						{/if}
						{#if editable}
							<button
								type="button"
								onclick={armFromInspect}
								class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded border border-brand-primary/40 bg-brand-primary/5 px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/10"
							>
								<ArrowLeftRight size={14} /> Déplacer / échanger…
							</button>
							<button
								type="button"
								onclick={removeFromInspect}
								class="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded border border-error/40 bg-error/5 px-3 py-1.5 text-sm font-medium text-error hover:bg-error/10"
							>
								<UserMinus size={14} /> Retirer du créneau
							</button>
						{/if}
					{:else}
						<!-- Carte contact : tous les créneaux du bénévole -->
						{#if inspect.isManaged}
							<!-- Sortie de secours du « niveau 3 » : sans ce bouton, une fiche sans email le
							     reste pour toujours. Le rattachement conserve les affectations déjà posées. -->
							<div class="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2">
								<p class="flex items-start gap-1.5 text-xs text-ink">
									<TriangleAlert size={13} class="mt-0.5 shrink-0 text-warning" />
									<span>
										Ajouté par un organisateur, sans email : ne se connecte pas et ne reçoit aucun
										rappel.
									</span>
								</p>
								{#if editable}
									{#if inspect.isEditable}
										<!-- Fiche créée par cet organisateur : le dialogue d'édition couvre aussi
										     l'email, inutile d'offrir deux chemins. -->
										<button
											type="button"
											onclick={editVolunteerFromInspect}
											class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded border border-warning/40 bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-warning/10"
										>
											<Pencil size={14} /> Modifier la fiche
										</button>
									{:else}
										<button
											type="button"
											onclick={attachEmailFromInspect}
											class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded border border-warning/40 bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-warning/10"
										>
											<Mail size={14} /> Ajouter son email
										</button>
									{/if}
								{/if}
							</div>
						{:else if inspect.isEditable && editable}
							<!-- Fiche créée par cet organisateur ET déjà pourvue d'un vrai email : c'est le cas
							     qu'`attachEmail` refusait, et donc la faute de frappe autrefois définitive. -->
							<button
								type="button"
								onclick={editVolunteerFromInspect}
								class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-brand-primary hover:text-ink"
							>
								<Pencil size={14} /> Modifier la fiche
							</button>
						{/if}
						<ul class="mt-2 flex max-h-64 flex-col gap-2 overflow-auto border-t border-border pt-2">
							{#each inspect.assignments as a, i (i)}
								<li class="flex flex-col gap-0.5">
									<div class="flex items-center justify-between gap-2">
										<span class="flex min-w-0 items-center gap-1.5">
											<span
												class="size-2.5 shrink-0 rounded-full"
												style="background-color: {a.color}"
											></span>
											<span class="truncate text-ink">{a.positionName}</span>
										</span>
										<span class="flex shrink-0 items-center gap-1.5">
											<span class="whitespace-nowrap text-ink-muted"
												>{a.dayLabel}, {a.timeLabel}</span
											>
											{#if a.status === 'available'}
												<Check size={14} class="shrink-0 text-success" />
											{:else}
												<CircleHelp size={14} class="shrink-0 text-warning" />
											{/if}
										</span>
									</div>
									{#if a.note}
										<p class="pl-4 text-xs text-ink-muted italic">« {a.note} »</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</Popover.Content>
			{/if}
		</Popover.Portal>
	</Popover.Root>
{/if}
