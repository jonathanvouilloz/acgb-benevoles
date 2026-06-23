<script lang="ts">
	import { enhance } from '$app/forms';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import { Check, CircleHelp } from 'lucide-svelte';
	import type { VolunteerShift } from '$lib/server/services/signup-service';

	let {
		shift,
		isLoggedIn,
		myId,
		form
	}: {
		shift: VolunteerShift;
		isLoggedIn: boolean;
		myId: string | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	const formError = $derived(
		form?.shiftId === shift.id && form?.formError ? (form.formError as string) : undefined
	);
</script>

<div class="flex flex-col gap-2 rounded border border-border bg-surface p-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="text-sm text-ink">
			<span class="font-medium text-ink-strong">{formatDay(shift.startsAt)}</span>
			· {formatTimeRange(shift.startsAt, shift.endsAt)}
		</div>
		{#if shift.myStatus}
			<StatusBadge status={shift.myStatus} />
		{:else if shift.isFull}
			<StatusBadge status="full" />
		{/if}
	</div>

	<!-- Places -->
	<p class="text-sm text-ink-muted">
		<span class:text-success={!shift.isFull} class:text-error={shift.isFull} class="font-medium">
			{shift.remaining}/{shift.capacity} place{shift.capacity > 1 ? 's' : ''}
		</span>
		{#if shift.maybeCount > 0}
			· {shift.maybeCount} peut-être
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
					<span class:font-semibold={su.userId === myId} class="truncate">
						{su.name}{#if su.userId === myId}<span class="text-ink-muted"> · toi</span>{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Actions -->
	{#if isLoggedIn}
		<div class="flex flex-wrap gap-2 pt-1">
			{#if shift.myStatus === null}
				<form method="POST" action="?/signup" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="shiftId" value={shift.id} />
					<input type="hidden" name="status" value="available" />
					<button
						type="submit"
						disabled={shift.isFull}
						class="inline-flex min-h-9 items-center gap-1 rounded bg-brand-secondary px-3 text-sm font-semibold text-white hover:brightness-95 disabled:pointer-events-none disabled:opacity-50"
					>
						<Check size={15} /> Je suis dispo
					</button>
				</form>
				<form method="POST" action="?/signup" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="shiftId" value={shift.id} />
					<input type="hidden" name="status" value="maybe" />
					<button
						type="submit"
						class="inline-flex min-h-9 items-center gap-1 rounded border border-border px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
					>
						<CircleHelp size={15} /> Peut-être
					</button>
				</form>
			{:else if shift.myStatus === 'maybe'}
				<form method="POST" action="?/changeStatus" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="shiftId" value={shift.id} />
					<input type="hidden" name="status" value="available" />
					<button
						type="submit"
						disabled={shift.isFull}
						class="inline-flex min-h-9 items-center gap-1 rounded bg-brand-secondary px-3 text-sm font-semibold text-white hover:brightness-95 disabled:pointer-events-none disabled:opacity-50"
					>
						<Check size={15} /> Confirmer dispo
					</button>
					{@render unregister()}
				</form>
			{:else}
				<form method="POST" action="?/changeStatus" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="shiftId" value={shift.id} />
					<input type="hidden" name="status" value="maybe" />
					<button
						type="submit"
						class="inline-flex min-h-9 items-center gap-1 rounded border border-border px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
					>
						<CircleHelp size={15} /> Passer en peut-être
					</button>
					{@render unregister()}
				</form>
			{/if}
		</div>
		{#if formError}
			<p class="text-sm text-error">{formError}</p>
		{/if}
	{/if}
</div>

{#snippet unregister()}
	<button
		type="submit"
		formaction="?/unregister"
		class="inline-flex min-h-9 items-center rounded px-3 text-sm font-medium text-ink-muted hover:bg-error/10 hover:text-error"
	>
		Me retirer
	</button>
{/snippet}
