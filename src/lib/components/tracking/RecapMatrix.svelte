<script lang="ts">
	import { formatDay, formatTime } from '$lib/format';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import type { AssignRequest, CellRef, ShiftRef } from './assignment-types';
	import { Check, CircleHelp, Pencil } from 'lucide-svelte';

	let {
		tournament,
		positionId = 'all',
		day = 'all',
		volunteerIds = null,
		statusFilter = 'all',
		interactive = false,
		onAssign
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
	} = $props();

	type Cell = 'available' | 'maybe' | null;
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

	// Réinitialise la sélection si la matrice change de contenu (filtres, données).
	$effect(() => {
		void matrix;
		selected = null;
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
			timeLabel: timeLabel(s)
		};
	}
	function isSelected(v: { id: string }, s: MatrixShift): boolean {
		return !!selected && selected.userId === v.id && selected.shiftId === s.id;
	}

	function clickCell(v: { id: string; name: string }, g: Group, s: MatrixShift, status: Cell) {
		if (!editable) return;
		if (!selected) {
			if (status) selected = makeCellRef(v, g, s, status);
			return;
		}
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
	}

	const matrix = $derived.by(() => {
		// Bénévoles uniques (ordre d'apparition), colonnes = créneaux groupés par poste.
		const volunteers = new Map<string, string>();
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
					if (!volunteers.has(su.userId)) volunteers.set(su.userId, su.name);
					lookup.set(`${su.userId}:${s.id}`, su.status);
					if (su.note) notes.set(`${su.userId}:${s.id}`, su.note);
				}
			}
			if (shifts.length > 0) groups.push({ name: p.name, color: p.color, shifts });
		}
		return {
			volunteers: [...volunteers.entries()].map(([id, name]) => ({ id, name })),
			groups,
			lookup,
			notes
		};
	});
</script>

<svelte:window
	onkeydown={editable && selected ? (e) => e.key === 'Escape' && (selected = null) : undefined}
/>

{#if matrix.volunteers.length === 0}
	<p
		class="rounded-lg border border-border bg-surface-subtle p-6 text-center text-sm text-ink-muted"
	>
		Aucune inscription pour le moment.
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
			<span class="size-1.5 rounded-full bg-warning"></span> note (survol)
		</span>
	</div>

	{#if editable}
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
				Cliquez la cellule d'un bénévole pour l'échanger ou le déplacer.
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
							class="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-ink-strong"
						>
							{v.name}
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
									class="relative border-b border-r border-border/60 text-center {editable
										? 'p-0'
										: 'px-2 py-1.5'}"
								>
									{#if editable}
										<button
											type="button"
											onclick={() => clickCell(v, g, s, cell)}
											class="flex w-full items-center justify-center px-2 py-1.5 transition-colors {isSelected(
												v,
												s
											)
												? 'bg-brand-primary/10 ring-2 ring-inset ring-brand-primary'
												: selected
													? 'cursor-pointer hover:bg-brand-primary/5'
													: cell
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
			</tbody>
		</table>
	</div>
{/if}
