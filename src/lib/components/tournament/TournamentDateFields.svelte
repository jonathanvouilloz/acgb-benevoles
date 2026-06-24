<script lang="ts">
	import { parseDate } from '@internationalized/date';
	import { DatePicker } from '$lib/components/ui/date-picker';

	let {
		start = '',
		end = '',
		errors
	}: {
		start?: string;
		end?: string;
		errors?: Record<string, string[] | undefined>;
	} = $props();

	/** `YYYY-MM-DD` + n jours → `YYYY-MM-DD` (chaîne vide si entrée vide/invalide). */
	function addDays(s: string, n: number): string {
		if (!s) return '';
		try {
			return parseDate(s).add({ days: n }).toString();
		} catch {
			return '';
		}
	}

	type Duration = '1' | '2' | 'custom';

	/** Déduit la durée initiale (édition) à partir des dates existantes. */
	function initialDuration(s: string, e: string): Duration {
		if (!s || !e) return '1';
		if (e === s) return '1';
		if (e === addDays(s, 1)) return '2';
		return 'custom';
	}

	// Valeurs initiales figées : les props ne changent pas pendant la vie du composant
	// (formulaire monté/démonté à chaque ouverture).
	// svelte-ignore state_referenced_locally
	let startStr = $state(start);
	// svelte-ignore state_referenced_locally
	let endCustom = $state(end || start);
	// svelte-ignore state_referenced_locally
	let duration = $state<Duration>(initialDuration(start, end));

	/** Date de fin effective soumise au serveur. */
	const computedEnd = $derived(
		duration === '1' ? startStr : duration === '2' ? addDays(startStr, 1) : endCustom
	);

	function setDuration(d: Duration) {
		duration = d;
		// En passant en « Autre », proposer une fin cohérente (≥ début).
		if (d === 'custom' && (!endCustom || endCustom < startStr)) {
			endCustom = addDays(startStr, 1) || startStr;
		}
	}

	const durations: { key: Duration; label: string }[] = [
		{ key: '1', label: '1 jour' },
		{ key: '2', label: '2 jours' },
		{ key: 'custom', label: 'Autre' }
	];
</script>

<div class="flex flex-col gap-1 text-sm font-medium text-ink">
	Date de début
	<DatePicker bind:value={startStr} name="startDate" placeholder="Choisir une date" />
	{#if errors?.startDate}<span class="text-xs font-normal text-error">{errors.startDate[0]}</span>{/if}
</div>

<div class="flex flex-col gap-1 text-sm font-medium text-ink">
	Durée
	<div class="flex w-fit overflow-hidden rounded border border-border">
		{#each durations as d (d.key)}
			<button
				type="button"
				onclick={() => setDuration(d.key)}
				class="min-h-9 border-l border-border px-3 text-sm font-medium transition duration-150 first:border-l-0 {duration ===
				d.key
					? 'skin-glossy skin-primary text-white'
					: 'bg-surface text-ink-muted hover:bg-surface-muted'}"
			>
				{d.label}
			</button>
		{/each}
	</div>
</div>

{#if duration === 'custom'}
	<div class="flex flex-col gap-1 text-sm font-medium text-ink">
		Date de fin
		<DatePicker
			bind:value={endCustom}
			name="endDate"
			minValue={startStr}
			placeholder="Choisir une date"
		/>
	</div>
{:else}
	<input type="hidden" name="endDate" value={computedEnd} />
{/if}

{#if errors?.endDate}<span class="text-xs text-error">{errors.endDate[0]}</span>{/if}
