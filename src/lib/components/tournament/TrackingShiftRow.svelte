<script lang="ts">
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import { Check, CircleHelp } from 'lucide-svelte';
	import type { VolunteerShift } from '$lib/server/services/signup-service';

	let { shift }: { shift: VolunteerShift } = $props();

	/** Libellé du manque côté organisateur (mise en évidence des créneaux non remplis). */
	const gap = $derived(
		shift.signups.length === 0
			? "Personne d'inscrit"
			: `${shift.remaining} place${shift.remaining > 1 ? 's' : ''} à pourvoir`
	);
</script>

<div
	class="flex flex-col gap-2 rounded border border-border bg-surface p-3"
	class:border-l-4={!shift.isFull}
	class:border-warning={!shift.isFull}
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="text-sm text-ink">
			<span class="font-medium text-ink-strong">{formatDay(shift.startsAt)}</span>
			· {formatTimeRange(shift.startsAt, shift.endsAt)}
		</div>
		{#if shift.isFull}
			<StatusBadge status="full" />
		{/if}
	</div>

	<!-- Remplissage -->
	<p class="text-sm text-ink-muted">
		<span class:text-success={shift.isFull} class:text-warning={!shift.isFull} class="font-medium">
			{shift.availableCount}/{shift.capacity} pourvue{shift.capacity > 1 ? 's' : ''}
		</span>
		{#if shift.maybeCount > 0}
			· {shift.maybeCount} peut-être
		{/if}
		{#if !shift.isFull}
			· {gap}
		{/if}
	</p>

	<!-- Inscrits -->
	{#if shift.signups.length > 0}
		<ul class="flex flex-col gap-1">
			{#each shift.signups as su (su.userId)}
				<li class="flex items-center gap-1.5 text-sm text-ink">
					{#if su.status === 'available'}
						<Check size={14} class="shrink-0 text-success" />
					{:else}
						<CircleHelp size={14} class="shrink-0 text-warning" />
					{/if}
					<span class="truncate">{su.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
