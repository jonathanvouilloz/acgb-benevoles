<script lang="ts">
	import { Popover, Calendar } from 'bits-ui';
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate
	} from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-svelte';

	let {
		value = $bindable(''),
		name,
		minValue,
		placeholder = 'Choisir une date',
		id
	}: {
		/** Date au format `YYYY-MM-DD` (compatible schéma Zod / form natif). */
		value?: string;
		name?: string;
		minValue?: string;
		placeholder?: string;
		id?: string;
	} = $props();

	const df = new DateFormatter('fr-CH', { dateStyle: 'long' });

	/** `YYYY-MM-DD` → CalendarDate (tolère une chaîne vide / invalide). */
	function toCal(s: string): CalendarDate | undefined {
		if (!s) return undefined;
		try {
			return parseDate(s);
		} catch {
			return undefined;
		}
	}

	let open = $state(false);
	let dateValue = $state<CalendarDate | undefined>(toCal(value));

	// Resync si le parent change `value` (ex : durée 2 jours recalcule la date de fin).
	$effect(() => {
		const next = toCal(value);
		const same = (!next && !dateValue) || (!!next && !!dateValue && next.compare(dateValue) === 0);
		if (!same) dateValue = next;
	});

	const minCal = $derived(minValue ? toCal(minValue) : undefined);
	const label = $derived(dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : '');
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{id}
		type="button"
		class="inline-flex min-h-9 w-full items-center justify-between gap-2 rounded border border-border bg-surface px-3 text-sm transition hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
	>
		<span class={label ? 'text-ink' : 'text-ink-muted'}>{label || placeholder}</span>
		<CalendarDays size={16} class="shrink-0 text-ink-muted" />
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			sideOffset={6}
			class="z-50 rounded-lg border border-border bg-surface p-3"
			style="box-shadow: var(--shadow-md)"
		>
			<Calendar.Root
				type="single"
				bind:value={dateValue}
				minValue={minCal}
				weekStartsOn={1}
				locale="fr-CH"
				weekdayFormat="short"
				fixedWeeks
				onValueChange={(v) => {
					value = v ? v.toString() : '';
					open = false;
				}}
				class="select-none"
			>
				{#snippet children({ months, weekdays })}
					<Calendar.Header class="flex items-center justify-between">
						<Calendar.PrevButton
							class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
						>
							<ChevronLeft size={18} />
						</Calendar.PrevButton>
						<Calendar.Heading class="text-sm font-semibold capitalize text-ink-strong" />
						<Calendar.NextButton
							class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
						>
							<ChevronRight size={18} />
						</Calendar.NextButton>
					</Calendar.Header>

					{#each months as month (month.value.toString())}
						<Calendar.Grid class="mt-2 w-full border-collapse">
							<Calendar.GridHead>
								<Calendar.GridRow class="flex">
									{#each weekdays as day (day)}
										<Calendar.HeadCell
											class="w-9 text-center text-xs font-normal capitalize text-ink-muted"
										>
											{day}
										</Calendar.HeadCell>
									{/each}
								</Calendar.GridRow>
							</Calendar.GridHead>
							<Calendar.GridBody>
								{#each month.weeks as weekDates (weekDates[0].toString())}
									<Calendar.GridRow class="flex w-full">
										{#each weekDates as date (date.toString())}
											<Calendar.Cell {date} month={month.value} class="p-0 text-center text-sm">
												<Calendar.Day
													class="inline-flex size-9 items-center justify-center rounded text-ink transition hover:bg-surface-muted data-disabled:pointer-events-none data-disabled:text-ink-muted/40 data-outside-month:text-ink-muted/40 data-selected:bg-brand-primary data-selected:font-semibold data-selected:text-white data-unavailable:text-ink-muted/40"
												>
													{date.day}
												</Calendar.Day>
											</Calendar.Cell>
										{/each}
									</Calendar.GridRow>
								{/each}
							</Calendar.GridBody>
						</Calendar.Grid>
					{/each}
				{/snippet}
			</Calendar.Root>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

{#if name}<input type="hidden" {name} {value} />{/if}
