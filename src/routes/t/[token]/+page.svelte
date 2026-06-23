<script lang="ts">
	import { page } from '$app/state';
	import VolunteerShiftRow from '$lib/components/tournament/VolunteerShiftRow.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateRange } from '$lib/format';
	import { CalendarDays, MapPin, LogIn } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const t = $derived(data.tournament);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
</script>

<svelte:head><title>{t.name} — Bénévoles ACGB</title></svelte:head>

<header class="flex flex-col gap-1">
	<h1 class="text-2xl font-bold text-ink-strong">{t.name}</h1>
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

{#if !data.isLoggedIn}
	<div
		class="mt-4 flex flex-col gap-3 rounded-lg border border-info/40 bg-info/10 p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<p class="text-sm text-ink">Connecte-toi pour t'inscrire sur un créneau.</p>
		<a href={loginHref}>
			<Button class="w-full sm:w-auto"><LogIn size={16} /> Se connecter</Button>
		</a>
	</div>
{/if}

<div class="mt-6 flex flex-col gap-6">
	{#if t.positions.length === 0}
		<p class="text-ink-muted">Aucun poste n'a encore été défini pour ce tournoi.</p>
	{:else}
		{#each t.positions as position (position.id)}
			<section class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<span class="size-3.5 shrink-0 rounded-full" style="background-color: {position.color}"
					></span>
					<div class="min-w-0">
						<h2 class="font-semibold text-ink-strong">{position.name}</h2>
						{#if position.description}
							<p class="text-sm text-ink-muted">{position.description}</p>
						{/if}
					</div>
				</div>

				{#if position.shifts.length === 0}
					<p class="text-sm text-ink-muted">Aucun créneau pour ce poste.</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each position.shifts as shift (shift.id)}
							<VolunteerShiftRow
								{shift}
								isLoggedIn={data.isLoggedIn}
								myId={data.me?.id ?? null}
								{form}
							/>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	{/if}
</div>
