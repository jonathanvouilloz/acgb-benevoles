<script lang="ts">
	/**
	 * Curseur de plage horaire à deux poignées, avec histogramme des besoins en fond.
	 * Contrôlé : `start`/`end` (minutes depuis minuit) viennent du parent, qui est notifié
	 * via `onchange`. `density` = places à pourvoir par heure sur [min, max) (1 valeur / heure).
	 * Heure murale UTC-naïf comme partout (cf. format.ts) — pas de conversion de fuseau ici.
	 */
	type Props = {
		min: number;
		max: number;
		step?: number;
		start: number;
		end: number;
		density: number[];
		onchange: (start: number, end: number) => void;
	};

	let { min, max, step = 30, start, end, density, onchange }: Props = $props();

	let trackEl = $state<HTMLDivElement | null>(null);
	let dragging = $state<'start' | 'end' | null>(null);

	const span = $derived(Math.max(1, max - min));
	const startPct = $derived(((start - min) / span) * 100);
	const endPct = $derived(((end - min) / span) * 100);
	const maxDensity = $derived(Math.max(1, ...density));

	/** "14h" ou "14h30". */
	function fmt(m: number): string {
		const h = Math.floor(m / 60);
		const mm = m % 60;
		return mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`;
	}

	/** Position X (px) → valeur snappée au pas et bornée à [min, max]. */
	function valueAt(clientX: number): number {
		if (!trackEl) return min;
		const r = trackEl.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		const raw = min + ratio * span;
		return Math.min(max, Math.max(min, Math.round(raw / step) * step));
	}

	function commit(which: 'start' | 'end', v: number) {
		if (which === 'start') onchange(Math.min(v, end - step), end);
		else onchange(start, Math.max(v, start + step));
	}

	function onThumbDown(which: 'start' | 'end', e: PointerEvent) {
		e.preventDefault();
		dragging = which;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onThumbMove(e: PointerEvent) {
		if (!dragging) return;
		commit(dragging, valueAt(e.clientX));
	}

	function onThumbUp(e: PointerEvent) {
		if (!dragging) return;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		dragging = null;
	}

	/** Tap sur le rail : déplace la poignée la plus proche. */
	function onTrackDown(e: PointerEvent) {
		if (dragging) return;
		const v = valueAt(e.clientX);
		commit(Math.abs(v - start) <= Math.abs(v - end) ? 'start' : 'end', v);
	}

	function onKey(which: 'start' | 'end', e: KeyboardEvent) {
		const cur = which === 'start' ? start : end;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') commit(which, cur - step);
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') commit(which, cur + step);
		else return;
		e.preventDefault();
	}

	/** Une barre (heure min+i) est-elle dans la fenêtre sélectionnée ? */
	function barSelected(i: number): boolean {
		const barStart = min + i * 60;
		return barStart < end && barStart + 60 > start;
	}
</script>

<div class="select-none">
	<p class="mb-2 text-center text-sm font-semibold text-ink-strong">
		{fmt(start)} – {fmt(end)}
	</p>

	<!-- Histogramme des besoins (places par heure) — aligné horizontalement sur le rail -->
	<div class="flex h-10 items-end gap-px">
		{#each density as d, i (i)}
			<div
				class="flex-1 rounded-t-sm transition-colors {barSelected(i)
					? 'bg-brand-primary/70'
					: 'bg-border'}"
				style="height: {d === 0 ? 2 : Math.max(8, (d / maxDensity) * 100)}%"
				title="{fmt((min + i) * 60)} · {d} place{d > 1 ? 's' : ''}"
			></div>
		{/each}
	</div>

	<!-- Rail + poignées (rangée dédiée : poignées parfaitement centrées sur le rail) -->
	<div
		bind:this={trackEl}
		role="presentation"
		onpointerdown={onTrackDown}
		class="relative h-5 touch-none"
	>
		<!-- Rail -->
		<div
			class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-muted"
		></div>
		<!-- Segment sélectionné -->
		<div
			class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-primary"
			style="left: {startPct}%; right: {100 - endPct}%"
		></div>

		<!-- Poignées -->
		<button
			type="button"
			role="slider"
			aria-label="Début de la plage"
			aria-valuemin={min}
			aria-valuemax={end - step}
			aria-valuenow={start}
			aria-valuetext={fmt(start)}
			onpointerdown={(e) => onThumbDown('start', e)}
			onpointermove={onThumbMove}
			onpointerup={onThumbUp}
			onkeydown={(e) => onKey('start', e)}
			class="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-brand-primary bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
			style="left: {startPct}%"
		></button>
		<button
			type="button"
			role="slider"
			aria-label="Fin de la plage"
			aria-valuemin={start + step}
			aria-valuemax={max}
			aria-valuenow={end}
			aria-valuetext={fmt(end)}
			onpointerdown={(e) => onThumbDown('end', e)}
			onpointermove={onThumbMove}
			onpointerup={onThumbUp}
			onkeydown={(e) => onKey('end', e)}
			class="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-brand-primary bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
			style="left: {endPct}%"
		></button>
	</div>

	<!-- Graduations min / max (rangée séparée : plus aucun chevauchement avec les poignées) -->
	<div class="mt-1.5 flex justify-between text-xs text-ink-muted">
		<span>{fmt(min)}</span>
		<span>{fmt(max)}</span>
	</div>
</div>
