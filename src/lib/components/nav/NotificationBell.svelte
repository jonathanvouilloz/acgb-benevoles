<script lang="ts">
	import { resolve } from '$app/paths';
	import { Bell, BellRing, ChevronRight } from 'lucide-svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import type { AgendaItem } from '$lib/nav-model';

	let {
		upcomingShifts,
		imminentCount = 0,
		path
	}: { upcomingShifts: AgendaItem[]; imminentCount?: number; path: string } = $props();

	let open = $state(false);
	const hasImminent = $derived(imminentCount > 0);

	// Ferme le panneau à chaque navigation.
	$effect(() => {
		void path;
		open = false;
	});
</script>

<div class="relative">
	<button
		type="button"
		class="relative flex size-9 items-center justify-center rounded-full border border-border text-ink-muted transition hover:border-brand-primary hover:text-brand-primary
			{open ? 'border-brand-primary text-brand-primary' : ''}"
		aria-label={hasImminent ? `Notifications (${imminentCount} créneaux imminents)` : 'Notifications'}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{#if hasImminent}
			<BellRing size={18} class="shrink-0" />
			<span
				class="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-error text-[0.6rem] font-bold leading-none text-white shadow-sm"
			>
				{imminentCount > 9 ? '9+' : imminentCount}
			</span>
		{:else}
			<Bell size={18} class="shrink-0" />
		{/if}
	</button>

	{#if open}
		<!-- Backdrop de fermeture -->
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label="Fermer les notifications"
			tabindex="-1"
			onclick={() => (open = false)}
		></button>

		<div
			class="notif-panel absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-md"
			role="menu"
		>
			<div class="border-b border-border px-3 py-2.5">
				<p class="text-sm font-semibold text-ink-strong">Prochains créneaux</p>
			</div>

			{#if upcomingShifts.length > 0}
				<ul class="max-h-80 overflow-y-auto">
					{#each upcomingShifts as s (s.shiftId)}
						<li>
							<a
								href={resolve('/t/[token]', { token: s.shareToken })}
								role="menuitem"
								class="flex flex-col gap-1 border-b border-border px-3 py-2.5 transition hover:bg-surface-subtle"
							>
								<span class="flex items-center justify-between gap-2">
									<span class="text-sm font-medium text-ink-strong">
										{formatDay(s.startsAt)}
									</span>
									<span class="text-xs text-ink-muted">
										{formatTimeRange(s.startsAt, s.endsAt)}
									</span>
								</span>
								<span class="flex items-center justify-between gap-2">
									<span class="flex min-w-0 items-center gap-1.5">
										<span
											class="size-2 shrink-0 rounded-full"
											style="background-color: {s.positionColor};"
										></span>
										<span class="truncate text-xs text-ink-muted">
											{s.positionName} · {s.tournamentName}
										</span>
									</span>
									<StatusBadge status={s.status} class="shrink-0 px-1.5 py-0.5 text-xs" />
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-3 py-4 text-center text-sm text-ink-muted">Aucun créneau à venir.</p>
			{/if}

			<a
				href={resolve('/compte')}
				role="menuitem"
				class="flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-ink transition hover:bg-surface-subtle"
			>
				<span class="flex items-center gap-2">
					<BellRing size={16} class="shrink-0 text-ink-muted" />
					Activer les rappels
				</span>
				<ChevronRight size={15} class="shrink-0 text-ink-muted" />
			</a>
		</div>
	{/if}
</div>

<style>
	.notif-panel {
		transform-origin: top right;
		animation: notif-pop var(--dur-fast, 150ms) var(--ease-out-strong, ease-out);
	}
	@keyframes notif-pop {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.notif-panel {
			animation: none;
		}
	}
</style>
