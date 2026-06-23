<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PositionCard from '$lib/components/tournament/PositionCard.svelte';
	import { formatDateRange, toDateInputValue } from '$lib/format';
	import {
		ArrowLeft,
		MapPin,
		CalendarDays,
		Pencil,
		Trash2,
		Plus,
		Check,
		X,
		Link2
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const t = $derived(data.tournament);

	let editingTournament = $state(false);
	let copied = $state(false);

	async function copyShareLink() {
		const url = `${window.location.origin}/t/${t.shareToken}`;
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	/** Extrait les erreurs de champ d'une action donnée (l'union ActionData ne se discrimine pas seule). */
	function fieldErrors(
		f: unknown,
		action: string
	): Record<string, string[] | undefined> | undefined {
		const obj = f as { action?: string; errors?: Record<string, string[] | undefined> } | null;
		return obj && obj.action === action ? obj.errors : undefined;
	}

	const tErrors = $derived(fieldErrors(form, 'updateTournament'));
	const posErrors = $derived(fieldErrors(form, 'createPosition'));
</script>

<svelte:head><title>{t.name} — Bénévoles ACGB</title></svelte:head>

<a
	href={resolve('/tournois')}
	class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
>
	<ArrowLeft size={16} /> Mes tournois
</a>

<!-- En-tête tournoi -->
{#if editingTournament}
	<form
		method="POST"
		action="?/updateTournament"
		class="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-surface-subtle p-4"
		use:enhance={() =>
			async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') editingTournament = false;
			}}
	>
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Nom
			<Input name="name" type="text" value={t.name} />
			{#if tErrors?.name}<span class="text-xs text-error">{tErrors.name[0]}</span>{/if}
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Lieu <span class="font-normal text-ink-muted">(optionnel)</span>
			<Input name="location" type="text" value={t.location ?? ''} />
		</label>
		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
				Début
				<Input name="startDate" type="date" value={toDateInputValue(t.startDate)} />
			</label>
			<label class="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
				Fin
				<Input name="endDate" type="date" value={toDateInputValue(t.endDate)} />
				{#if tErrors?.endDate}<span class="text-xs text-error">{tErrors.endDate[0]}</span>{/if}
			</label>
		</div>
		<div class="flex gap-2">
			<Button type="submit"><Check size={16} /> Enregistrer</Button>
			<Button type="button" variant="ghost" onclick={() => (editingTournament = false)}>
				<X size={16} /> Annuler
			</Button>
		</div>
	</form>
{:else}
	<div class="mt-3 flex items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-ink-strong">{t.name}</h1>
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
		</div>
		<div class="flex shrink-0 gap-0.5">
			<button
				type="button"
				title="Modifier le tournoi"
				onclick={() => (editingTournament = true)}
				class="inline-flex size-9 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
			>
				<Pencil size={16} />
			</button>
			<form
				method="POST"
				action="?/deleteTournament"
				use:enhance={() =>
					async ({ update }) =>
						update()}
			>
				<button
					type="submit"
					title="Supprimer le tournoi"
					onclick={(e) => {
						if (!confirm(`Supprimer le tournoi « ${t.name} » et tout son contenu ?`))
							e.preventDefault();
					}}
					class="inline-flex size-9 items-center justify-center rounded text-ink-muted hover:bg-error/10 hover:text-error"
				>
					<Trash2 size={16} />
				</button>
			</form>
		</div>
	</div>

	<!-- Lien de partage -->
	<button
		type="button"
		onclick={copyShareLink}
		class="mt-3 inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-sm text-ink-muted hover:border-brand-primary hover:text-ink"
	>
		<Link2 size={15} />
		{copied ? 'Lien copié !' : 'Copier le lien de partage'}
	</button>
{/if}

<!-- Postes -->
<h2 class="mt-8 text-lg font-semibold text-ink-strong">Postes</h2>

{#if t.positions.length === 0}
	<p class="mt-2 text-sm text-ink-muted">Aucun poste. Ajoute le premier ci-dessous.</p>
{:else}
	<div class="mt-3 flex flex-col gap-4">
		{#each t.positions as position (position.id)}
			<PositionCard {position} tournament={t} {form} />
		{/each}
	</div>
{/if}

<!-- Ajout de poste -->
<form
	method="POST"
	action="?/createPosition"
	class="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
	use:enhance={() =>
		async ({ update }) =>
			update()}
>
	<div class="flex flex-wrap items-end gap-2">
		<label class="flex flex-1 flex-col gap-0.5 text-xs font-medium text-ink-muted">
			Nouveau poste
			<Input name="name" type="text" placeholder="Buvette, Accueil, Arbitre…" class="text-sm" />
		</label>
		<Button type="submit" class="min-h-11 px-3"><Plus size={16} /> Ajouter</Button>
	</div>
	{#if posErrors?.name}<span class="text-xs text-error">{posErrors.name[0]}</span>{/if}
</form>
