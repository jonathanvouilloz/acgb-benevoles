<script lang="ts">
	import { resolve } from '$app/paths';
	import { Users, Trophy, ClipboardList, Percent, UserCheck } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const s = $derived(data.stats);
	const fillPct = $derived(s.fillRate === null ? '—' : `${Math.round(s.fillRate * 100)}%`);
</script>

<svelte:head><title>Administration — Bénévoles ACGB</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">Tableau de bord</h1>
<p class="mt-1 text-sm text-ink-muted">Vue d'ensemble de l'activité ACGB.</p>

<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
	<div class="rounded-lg border border-border bg-surface p-4">
		<div class="flex items-center gap-1.5 text-ink-muted"><Users size={15} /> <span class="text-xs font-medium">Utilisateurs</span></div>
		<p class="mt-1 text-2xl font-bold text-ink-strong">{s.users.total}</p>
		<p class="mt-0.5 text-xs text-ink-muted">
			{s.users.volunteers} bénévoles · {s.users.organizers} orga · {s.users.superAdmins} admin
		</p>
	</div>

	<div class="rounded-lg border border-border bg-surface p-4">
		<div class="flex items-center gap-1.5 text-ink-muted"><Trophy size={15} /> <span class="text-xs font-medium">Tournois</span></div>
		<p class="mt-1 text-2xl font-bold text-ink-strong">{s.tournaments.total}</p>
		<p class="mt-0.5 text-xs text-ink-muted">
			{s.tournaments.upcoming} à venir · {s.tournaments.ongoing} en cours · {s.tournaments.past} terminés
		</p>
	</div>

	<div class="rounded-lg border border-border bg-surface p-4">
		<div class="flex items-center gap-1.5 text-ink-muted"><ClipboardList size={15} /> <span class="text-xs font-medium">Inscriptions</span></div>
		<p class="mt-1 text-2xl font-bold text-ink-strong">{s.signups}</p>
		<p class="mt-0.5 text-xs text-ink-muted">tous tournois confondus</p>
	</div>

	<div class="rounded-lg border border-border bg-surface p-4">
		<div class="flex items-center gap-1.5 text-ink-muted"><Percent size={15} /> <span class="text-xs font-medium">Remplissage</span></div>
		<p class="mt-1 text-2xl font-bold text-ink-strong">{fillPct}</p>
		<p class="mt-0.5 text-xs text-ink-muted">places « disponible » / capacité</p>
	</div>

	<a
		href={resolve('/admin/utilisateurs')}
		class="rounded-lg border p-4 transition hover:shadow-sm
			{s.pendingRequests > 0
			? 'border-warning/40 bg-warning/10 hover:border-warning'
			: 'border-border bg-surface hover:border-brand-primary'}"
	>
		<div class="flex items-center gap-1.5 text-ink-muted"><UserCheck size={15} /> <span class="text-xs font-medium">Demandes orga</span></div>
		<p class="mt-1 text-2xl font-bold text-ink-strong">{s.pendingRequests}</p>
		<p class="mt-0.5 text-xs text-ink-muted">
			{s.pendingRequests > 0 ? 'en attente — traiter' : 'aucune en attente'}
		</p>
	</a>
</div>
