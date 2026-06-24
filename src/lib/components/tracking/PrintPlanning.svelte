<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDateRange, formatDay, formatTime } from '$lib/format';
	import { planningByPoste } from '$lib/recap';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';

	let {
		tournament,
		format = 'poste',
		positionId = 'all',
		day = 'all'
	}: {
		tournament: VolunteerTournament;
		format?: 'poste' | 'matrix';
		positionId?: string;
		day?: string;
	} = $props();

	const filters = $derived({ positionId, day });
	const postes = $derived(planningByPoste(tournament, filters));

	// Matrice (bénévoles × créneaux) pour le format « matrice ».
	type Cell = 'available' | 'maybe' | null;
	const matrix = $derived.by(() => {
		const volunteers = new Map<string, string>();
		const lookup = new Map<string, Cell>();
		const groups = postes.map((p) => ({
			name: p.name,
			color: p.color,
			shifts: p.shifts.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt }))
		}));
		for (const p of tournament.positions) {
			if (positionId !== 'all' && p.id !== positionId) continue;
			for (const s of p.shifts) {
				if (day !== 'all' && s.startsAt.toISOString().slice(0, 10) !== day) continue;
				for (const su of s.signups) {
					if (!volunteers.has(su.userId)) volunteers.set(su.userId, su.name);
					lookup.set(`${su.userId}:${s.id}`, su.status);
				}
			}
		}
		return {
			volunteers: [...volunteers.entries()].map(([id, name]) => ({ id, name })),
			groups,
			lookup
		};
	});

	// Date d'impression — fixée au montage pour éviter tout écart d'hydratation.
	let printedAt = $state('');
	onMount(() => {
		printedAt = new Intl.DateTimeFormat('fr-CH', { dateStyle: 'long' }).format(new Date());
	});
</script>

<!-- Visible uniquement à l'impression -->
<div class="print-planning hidden print:block">
	<!-- En-tête -->
	<header class="print-head">
		<h1>{tournament.name}</h1>
		<p class="meta">
			Planning bénévoles · {formatDateRange(tournament.startDate, tournament.endDate)}{#if tournament.location}
				· {tournament.location}{/if}{#if printedAt}
				· imprimé le {printedAt}{/if}
		</p>
		<p class="legend">
			<span class="dot ok"></span> Disponible
			<span class="dot maybe"></span> Peut-être
			<span class="dot todo"></span> À pourvoir
		</p>
	</header>

	{#if postes.length === 0}
		<p class="empty">Aucune inscription.</p>
	{:else if format === 'poste'}
		{#each postes as p (p.id)}
			<section class="poste">
				<h2><span class="pdot" style="background-color: {p.color}"></span> {p.name}</h2>
				<table>
					<thead>
						<tr>
							<th class="col-creneau">Créneau</th>
							<th class="col-places">Places</th>
							<th>Bénévoles disponibles</th>
							<th class="col-maybe">Peut-être</th>
						</tr>
					</thead>
					<tbody>
						{#each p.shifts as s (s.id)}
							<tr>
								<td class="col-creneau">
									{formatDay(s.startsAt)} · {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
								</td>
								<td class="col-places" class:full={s.isFull} class:todo={!s.isFull}>
									{s.availableCount}/{s.capacity}
									{#if !s.isFull}<span class="todo-note">({s.remaining} à pourvoir)</span>{/if}
								</td>
								<td>{s.available.length > 0 ? s.available.join(', ') : '—'}</td>
								<td class="col-maybe">{s.maybe.length > 0 ? s.maybe.join(', ') : ''}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}
	{:else}
		<!-- Format matrice -->
		<table class="matrix">
			<thead>
				<tr>
					<th rowspan="2" class="col-name">Bénévole</th>
					{#each matrix.groups as g (g.name)}
						<th colspan={g.shifts.length} class="grp">
							<span class="pdot" style="background-color: {g.color}"></span> {g.name}
						</th>
					{/each}
				</tr>
				<tr>
					{#each matrix.groups as g (g.name)}
						{#each g.shifts as s (s.id)}
							<th class="slot">
								{formatDay(s.startsAt)}<br />{formatTime(s.startsAt)}–{formatTime(s.endsAt)}
							</th>
						{/each}
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each matrix.volunteers as v (v.id)}
					<tr>
						<th class="col-name">{v.name}</th>
						{#each matrix.groups as g (g.name)}
							{#each g.shifts as s (s.id)}
								{@const cell = matrix.lookup.get(`${v.id}:${s.id}`)}
								<td class="cell">
									{#if cell === 'available'}<span class="mk ok">✓</span>
									{:else if cell === 'maybe'}<span class="mk maybe">?</span>
									{:else}·{/if}
								</td>
							{/each}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	/* Tout est confiné à l'impression : couleurs préservées, zéro crop. */
	.print-planning {
		color: #000;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		font-size: 9.5pt;
		line-height: 1.3;
	}

	.print-head {
		margin-bottom: 8pt;
		border-bottom: 1.5pt solid var(--brand-primary);
		padding-bottom: 4pt;
	}
	.print-head h1 {
		font-size: 15pt;
		font-weight: 700;
		color: var(--brand-primary);
		margin: 0;
	}
	.print-head .meta {
		font-size: 9pt;
		color: #333;
		margin: 2pt 0 0;
	}
	.print-head .legend {
		font-size: 8.5pt;
		color: #333;
		margin: 4pt 0 0;
		display: flex;
		align-items: center;
		gap: 10pt;
	}
	.legend .dot {
		display: inline-block;
		width: 8pt;
		height: 8pt;
		border-radius: 999px;
		margin-right: 2pt;
		vertical-align: middle;
	}
	.legend .dot.ok {
		background: var(--success);
	}
	.legend .dot.maybe {
		background: var(--warning);
	}
	.legend .dot.todo {
		background: #cfd5de;
	}

	.empty {
		font-style: italic;
		color: #555;
	}

	/* --- Format « par poste » --- */
	.poste {
		break-inside: avoid;
		margin-top: 8pt;
	}
	.poste h2 {
		font-size: 11pt;
		font-weight: 600;
		margin: 0 0 3pt;
		display: flex;
		align-items: center;
		gap: 5pt;
	}
	.pdot {
		display: inline-block;
		width: 8pt;
		height: 8pt;
		border-radius: 999px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		border: 0.75pt solid #b9c0cc;
		padding: 2.5pt 5pt;
		text-align: left;
		vertical-align: top;
	}
	thead th {
		background: #eef1f6;
		font-weight: 600;
		font-size: 8.5pt;
	}
	tbody tr {
		break-inside: avoid;
	}
	.col-creneau {
		white-space: nowrap;
		width: 22%;
	}
	.col-places {
		white-space: nowrap;
		width: 13%;
		font-weight: 600;
	}
	.col-places.full {
		color: var(--success);
	}
	.col-places.todo {
		color: var(--warning);
	}
	.col-places .todo-note {
		font-weight: 400;
		font-size: 8pt;
	}
	.col-maybe {
		color: #8a6d1a;
		width: 22%;
	}

	/* --- Format matrice --- */
	.matrix {
		font-size: 8.5pt;
	}
	.matrix th.grp {
		text-align: center;
	}
	.matrix th.slot {
		font-size: 7.5pt;
		font-weight: 500;
		white-space: nowrap;
		text-align: center;
	}
	.matrix th.col-name {
		text-align: left;
		min-width: 90pt;
	}
	.matrix td.cell {
		text-align: center;
	}
	.matrix .mk {
		font-weight: 700;
	}
	.matrix .mk.ok {
		color: var(--success);
	}
	.matrix .mk.maybe {
		color: var(--warning);
	}
</style>
