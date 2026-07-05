<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Modal } from '$lib/components/ui/modal';
	import { confirmAction } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast.svelte';
	import PositionCard from '$lib/components/tournament/PositionCard.svelte';
	import TournamentDateFields from '$lib/components/tournament/TournamentDateFields.svelte';
	import { POSITION_PRESETS } from '$lib/position-presets';
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
		Link2,
		ClipboardList
	} from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const t = $derived(data.tournament);

	let editingTournament = $state(false);
	let creatingPosition = $state(false);
	let copied = $state(false);

	// --- Repli/dépli des cards de poste (vide = tout replié par défaut) ---
	const expanded = new SvelteSet<string>();
	const allExpanded = $derived(
		t.positions.length > 0 && t.positions.every((p) => expanded.has(p.id))
	);

	function toggleExpanded(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}
	function expandAll() {
		for (const p of t.positions) expanded.add(p.id);
	}
	function collapseAll() {
		expanded.clear();
	}

	// --- Ajout de postes (presets multi-sélection + custom) ---
	let selectedPresets = $state<string[]>([]);
	let customName = $state('');

	const existingNames = $derived(new Set(t.positions.map((p) => p.name.trim().toLowerCase())));
	const newPositionCount = $derived(selectedPresets.length + (customName.trim() ? 1 : 0));

	function togglePreset(name: string) {
		selectedPresets = selectedPresets.includes(name)
			? selectedPresets.filter((n) => n !== name)
			: [...selectedPresets, name];
	}

	function resetPositionForm() {
		selectedPresets = [];
		customName = '';
	}

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
	const posErrors = $derived(fieldErrors(form, 'createPositions'));
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
				if (result.type === 'success') {
					editingTournament = false;
					toast.success('Tournoi mis à jour');
				}
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
		<TournamentDateFields
			start={toDateInputValue(t.startDate)}
			end={toDateInputValue(t.endDate)}
			errors={tErrors}
		/>
		<div class="flex gap-2">
			<Button type="submit" size="sm"><Check size={16} /> Enregistrer</Button>
			<Button type="button" size="sm" variant="ghost" onclick={() => (editingTournament = false)}>
				<X size={16} /> Annuler
			</Button>
		</div>
	</form>
{:else}
	<div class="mt-3 flex items-start justify-between gap-3">
		<div>
			<h1 class="h1">{t.name}</h1>
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
					async ({ update, result }) => {
						if (result.type === 'redirect') toast.success('Tournoi supprimé');
						await update();
					}}
			>
				<button
					type="submit"
					title="Supprimer le tournoi"
					onclick={async (e) => {
						e.preventDefault();
						const f = e.currentTarget.form;
						const ok = await confirmAction({
							title: 'Supprimer le tournoi',
							message: `« ${t.name} » et tout son contenu (postes, créneaux, inscriptions) seront supprimés définitivement.`,
							confirmLabel: 'Supprimer',
							variant: 'danger'
						});
						if (ok) f?.requestSubmit();
					}}
					class="inline-flex size-9 items-center justify-center rounded text-ink-muted hover:bg-error/10 hover:text-error"
				>
					<Trash2 size={16} />
				</button>
			</form>
		</div>
	</div>

	<!-- Lien de partage + accès au suivi -->
	<div class="mt-3 flex flex-wrap gap-2">
		<button
			type="button"
			onclick={copyShareLink}
			class="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-sm text-ink-muted hover:border-brand-primary hover:text-ink"
		>
			<Link2 size={15} />
			{copied ? 'Lien copié !' : 'Copier le lien de partage'}
		</button>
		<a
			href={resolve('/tournois/[id]/suivi', { id: t.id })}
			class="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-sm text-ink-muted hover:border-brand-primary hover:text-ink"
		>
			<ClipboardList size={15} />
			Voir le suivi
		</a>
	</div>
{/if}

<!-- Postes -->
<div class="mt-8 flex items-center justify-between gap-3">
	<h2 class="h2">Postes</h2>
	<div class="flex items-center gap-2">
		{#if t.positions.length > 0}
			<button
				type="button"
				onclick={allExpanded ? collapseAll : expandAll}
				class="text-sm text-ink-muted hover:text-ink"
			>
				{allExpanded ? 'Tout replier' : 'Tout déplier'}
			</button>
		{/if}
		<Button type="button" size="sm" onclick={() => (creatingPosition = true)}>
			<Plus size={16} /> Ajouter
		</Button>
	</div>
</div>

{#if t.positions.length === 0}
	<p class="mt-2 text-sm text-ink-muted">Aucun poste. Ajoute le premier avec « Ajouter ».</p>
{:else}
	<div class="mt-3 flex flex-col gap-4">
		{#each t.positions as position, i (position.id)}
			<div class="fade-up" style="animation-delay: {i * 60}ms">
				<PositionCard
					{position}
					tournament={t}
					{form}
					collapsed={!expanded.has(position.id)}
					onToggleCollapse={() => toggleExpanded(position.id)}
				/>
			</div>
		{/each}
	</div>
{/if}

<!-- Ajout de postes (modale) -->
<Modal bind:open={creatingPosition} title="Ajouter des postes" onclose={resetPositionForm}>
	<form
		method="POST"
		action="?/createPositions"
		class="flex flex-col gap-4"
		use:enhance={() =>
			async ({ update, result }) => {
				await update();
				if (result.type === 'success') {
					creatingPosition = false;
					resetPositionForm();
					toast.success('Postes ajoutés');
				}
			}}
	>
		<!-- Presets courants -->
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium text-ink">Postes courants</span>
			<div class="flex flex-wrap gap-2">
				{#each POSITION_PRESETS as preset (preset)}
					{@const exists = existingNames.has(preset.toLowerCase())}
					{@const active = selectedPresets.includes(preset)}
					<button
						type="button"
						disabled={exists}
						onclick={() => togglePreset(preset)}
						class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition duration-150 {exists
							? 'cursor-not-allowed border-border bg-surface-muted text-ink-muted/60'
							: active
								? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
								: 'border-border bg-surface text-ink-muted hover:border-ink-muted hover:text-ink'}"
					>
						{#if active || exists}<Check size={14} class="shrink-0" />{/if}
						{preset}
					</button>
					{#if active}<input type="hidden" name="names" value={preset} />{/if}
				{/each}
			</div>
			{#if POSITION_PRESETS.every((p) => existingNames.has(p.toLowerCase()))}
				<p class="text-xs text-ink-muted">Tous les postes courants sont déjà ajoutés.</p>
			{/if}
		</div>

		<!-- Poste custom -->
		<label class="flex flex-col gap-1 text-sm font-medium text-ink">
			Autre poste <span class="font-normal text-ink-muted">(optionnel)</span>
			<Input name="names" type="text" bind:value={customName} placeholder="Vestiaire, Sono…" />
			{#if posErrors?.names}<span class="text-xs font-normal text-error">{posErrors.names[0]}</span
				>{/if}
		</label>

		<div class="flex justify-end gap-2">
			<Button type="button" size="sm" variant="ghost" onclick={() => (creatingPosition = false)}>
				Annuler
			</Button>
			<Button type="submit" size="sm" disabled={newPositionCount === 0}>
				<Plus size={16} /> Ajouter{newPositionCount > 0 ? ` (${newPositionCount})` : ''}
			</Button>
		</div>
	</form>
</Modal>
