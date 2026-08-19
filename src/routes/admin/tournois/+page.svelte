<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { PhaseBadge } from '$lib/components/ui/phase-badge';
	import { confirmAction } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatDateRange } from '$lib/format';
	import { CalendarDays, MapPin, User, ExternalLink, Trash2 } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Tournois — Administration</title></svelte:head>

<h1 class="h1">Tous les tournois ({data.tournaments.length})</h1>

{#if data.tournaments.length === 0}
	<p class="mt-6 text-sm text-ink-muted">Aucun tournoi pour le moment.</p>
{:else}
	<ul class="mt-6 grid gap-2 lg:grid-cols-2">
		{#each data.tournaments as t (t.id)}
			<li class="rounded-lg border border-border bg-surface p-4">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h2 class="h3">{t.name}</h2>
							<PhaseBadge phase={t.phase} />
							{#if !t.published}
								<span
									class="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-ink-muted"
								>
									Brouillon
								</span>
							{/if}
						</div>
						<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
							<CalendarDays size={15} />
							{formatDateRange(t.startDate, t.endDate)}
						</p>
						{#if t.location}
							<p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
								<MapPin size={15} />
								{t.location}
							</p>
						{/if}
						<p class="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
							<User size={14} />
							{t.organizerName} · {t.organizerEmail}
						</p>
					</div>
					<div class="flex flex-col items-end gap-1.5">
						<span class="text-sm font-medium text-ink">
							{t.signupCount} inscription{t.signupCount > 1 ? 's' : ''}
						</span>
						<a
							href={resolve('/t/[token]', { token: t.shareToken })}
							class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
						>
							Voir <ExternalLink size={13} />
						</a>
						<form
							method="POST"
							action="?/deleteTournament"
							use:enhance={() =>
								async ({ update, result }) => {
									if (result.type === 'success') toast.success('Tournoi supprimé');
									await update();
								}}
						>
							<input type="hidden" name="tournamentId" value={t.id} />
							<button
								type="submit"
								title="Supprimer le tournoi"
								onclick={async (e) => {
									e.preventDefault();
									const f = e.currentTarget.form;
									const ok = await confirmAction({
										title: 'Supprimer le tournoi',
										message: `« ${t.name} » (organisé par ${t.organizerEmail}) et tout son contenu (postes, créneaux, inscriptions) seront supprimés définitivement.`,
										confirmLabel: 'Supprimer',
										variant: 'danger'
									});
									if (ok) f?.requestSubmit();
								}}
								class="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-error"
							>
								<Trash2 size={13} /> Supprimer
							</button>
						</form>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}
