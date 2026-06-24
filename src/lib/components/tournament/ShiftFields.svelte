<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import { addMinutesClamped, dayOptions, timeOptions } from '$lib/time-options';
	import type { Tournament } from '$lib/server/db/schema';

	let {
		tournament,
		day = $bindable(),
		startTime = $bindable(''),
		endTime = $bindable(''),
		capacity = '1'
	}: {
		tournament: Pick<Tournament, 'startDate' | 'endDate'>;
		day?: string;
		startTime?: string;
		endTime?: string;
		capacity?: string;
	} = $props();

	const days = $derived(dayOptions(tournament.startDate, tournament.endDate));
	const times = timeOptions(15);

	// Jour par défaut = premier jour du tournoi si non fourni.
	$effect(() => {
		if (!day && days.length > 0) day = days[0].value;
	});

	/** À la sélection du début, pré-remplit la fin à +1 h (bornée à 21:00) si vide ou pas après le début. */
	function onStartChange() {
		if (startTime && (!endTime || endTime <= startTime)) {
			endTime = addMinutesClamped(startTime, 60, '21:00');
		}
	}
</script>

<label class="flex flex-col gap-0.5 text-xs font-medium text-ink-muted">
	Jour
	<Select name="day" bind:value={day} options={days} />
</label>
<label class="flex flex-col gap-0.5 text-xs font-medium text-ink-muted">
	Début
	<Select name="startTime" bind:value={startTime} onchange={onStartChange} class="w-28">
		<option value="" disabled>—</option>
		{#each times as t (t.value)}
			<option value={t.value}>{t.label}</option>
		{/each}
	</Select>
</label>
<label class="flex flex-col gap-0.5 text-xs font-medium text-ink-muted">
	Fin
	<Select name="endTime" bind:value={endTime} class="w-28">
		<option value="" disabled>—</option>
		{#each times as t (t.value)}
			<option value={t.value}>{t.label}</option>
		{/each}
	</Select>
</label>
<label class="flex w-20 flex-col gap-0.5 text-xs font-medium text-ink-muted">
	Places
	<Input name="capacity" type="number" min="1" max="99" value={capacity} />
</label>
