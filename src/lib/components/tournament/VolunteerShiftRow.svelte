<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import { toast } from '$lib/toast.svelte';
	import { confirmAction } from '$lib/confirm.svelte';
	import type { BusyShift } from '$lib/overlap';
	import { Check, CircleHelp, ChevronDown, Plus, TriangleAlert } from 'lucide-svelte';
	import type { VolunteerShift } from '$lib/server/services/signup-service';

	let {
		shift,
		isLoggedIn,
		myId,
		form,
		positionName = '',
		positionColor = '',
		positionDescription = null,
		past = false,
		featured = false,
		showPosition = true,
		showDay = true,
		conflicts = []
	}: {
		shift: VolunteerShift;
		isLoggedIn: boolean;
		myId: string | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
		positionName?: string;
		positionColor?: string;
		/** Consigne du poste, affichée dans le panneau déplié quand la ligne porte l'étiquette. */
		positionDescription?: string | null;
		past?: boolean;
		featured?: boolean;
		/** Affiche l'étiquette de poste sur la ligne (masquée quand on groupe déjà par poste). */
		showPosition?: boolean;
		/** Affiche le jour sur la ligne (masqué quand l'en-tête de groupe porte déjà le jour). */
		showDay?: boolean;
		/** Créneaux déjà pris par le bénévole qui recouvrent celui-ci (cf. $lib/overlap). */
		conflicts?: BusyShift[];
	} = $props();

	const formError = $derived(
		form?.shiftId === shift.id && form?.formError ? (form.formError as string) : undefined
	);

	// Déplié par défaut pour le créneau mis en avant ou en cas d'erreur sur ce créneau.
	// svelte-ignore state_referenced_locally
	let expanded = $state(featured || Boolean(formError));
	$effect(() => {
		if (formError) expanded = true;
	});

	// Note libre du bénévole (pré-remplie avec sa note existante). Mirorée en input caché dans
	// les forms d'inscription, et éditable seule via l'action `setNote`.
	// svelte-ignore state_referenced_locally
	let note = $state(shift.myNote ?? '');
	const noteDirty = $derived(note.trim() !== (shift.myNote ?? ''));
	// La précision n'est proposée qu'une fois inscrit : repliée derrière « + Ajouter une précision ».
	let editingNote = $state(false);

	/** « 1 place libre » / « 3 places libres ». */
	function freeLabel(n: number): string {
		return `${n} place${n > 1 ? 's' : ''} libre${n > 1 ? 's' : ''}`;
	}

	/** Focus du champ dès qu'on l'ouvre (action Svelte). */
	function autofocus(el: HTMLTextAreaElement) {
		el.focus();
	}

	/** Une action rapide « Je prends » est proposée directement sur la ligne repliée. */
	const canQuickSignup = $derived(isLoggedIn && !past && shift.myStatus === null && !shift.isFull);

	/** Visiteur non connecté : mêmes actions, mais elles passent par la connexion. */
	const canLoginSignup = $derived(!isLoggedIn && !past);

	/**
	 * Cible de retour après connexion, encodée pour `?redirect=` : elle garde l'intention, que la
	 * page /t/[token] lit (`prendre` + `statut`) pour soumettre l'inscription d'elle-même.
	 */
	function loginTarget(status: 'available' | 'maybe'): string {
		const target =
			`${page.url.pathname}?prendre=${shift.id}` + (status === 'maybe' ? '&statut=maybe' : '');
		return encodeURIComponent(target);
	}

	/** Inscrits réordonnés : l'utilisateur connecté en tête, le reste garde l'ordre serveur. */
	const sortedSignups = $derived(
		myId
			? [...shift.signups].sort((a, b) => (a.userId === myId ? -1 : b.userId === myId ? 1 : 0))
			: shift.signups
	);

	/** Conflits d'agenda à signaler : jamais sur un créneau passé. */
	const activeConflicts = $derived(past ? [] : conflicts);

	function conflictLabel(c: BusyShift): string {
		const when = `${formatDay(c.startsAt)} · ${formatTimeRange(c.startsAt, c.endsAt)}`;
		const where = c.tournamentName ? `${c.positionName} (${c.tournamentName})` : c.positionName;
		return `${where} — ${when}`;
	}

	/**
	 * Garde de chevauchement : on **avertit sans bloquer** (cf. $lib/overlap). Même motif que
	 * les suppressions (`ShiftRow.svelte`) — on annule le submit natif, on demande confirmation,
	 * puis on re-soumet avec le même bouton pour préserver son `formaction`.
	 */
	async function guardOverlap(e: MouseEvent & { currentTarget: HTMLButtonElement }) {
		if (activeConflicts.length === 0) return;
		e.preventDefault();
		const btn = e.currentTarget;
		const ok = await confirmAction({
			title: 'Ce créneau en chevauche un autre',
			message: `Tu es déjà pris sur : ${activeConflicts.map(conflictLabel).join(' · ')}. T'inscrire quand même ?`,
			confirmLabel: "M'inscrire quand même"
		});
		if (ok) btn.form?.requestSubmit(btn);
	}

	/**
	 * enhance + toast de succès. Le bouton « Me retirer » (formaction=?/unregister)
	 * partage le formulaire d'un changeStatus : on distingue via l'action soumise.
	 */
	function signupEnhance(defaultMsg: string, unregisterMsg = ''): SubmitFunction {
		return ({ action }) =>
			async ({ update, result }) => {
				await update({ reset: false });
				if (result.type !== 'success') return;
				const isUnregister = action.search.includes('unregister');
				toast.success(isUnregister && unregisterMsg ? unregisterMsg : defaultMsg);
			};
	}

	/** Enregistrement de la précision : toast + repli du champ. */
	const noteEnhance: SubmitFunction =
		() =>
		async ({ update, result }) => {
			await update({ reset: false });
			if (result.type !== 'success') return;
			editingNote = false;
			toast.success('Précision enregistrée');
		};
</script>

<div
	class="rounded-lg border border-border bg-surface-subtle transition-colors"
	class:opacity-60={past}
>
	<!-- En-tête compact (toujours visible) : déplie le détail. L'action rapide « Je prends » est
	     un formulaire frère (jamais imbriqué dans le bouton de dépliage). -->
	<div class="flex items-center gap-2 p-3">
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
		>
			{#if showPosition && positionName}
				<span class="size-2.5 shrink-0 rounded-full" style="background-color: {positionColor}"
				></span>
			{/if}
			<!-- Places libres sous l'horaire : à droite, avec « Je prends », elles tronquaient l'heure. -->
			<span class="flex min-w-0 flex-col">
				<span class="truncate text-sm text-ink">
					{#if showPosition && positionName}<span class="font-medium text-ink-strong"
							>{positionName}</span
						> ·
					{/if}{#if showDay}{formatDay(shift.startsAt)} ·
					{/if}<span class="font-semibold text-ink-strong"
						>{formatTimeRange(shift.startsAt, shift.endsAt)}</span
					>
				</span>
				{#if !shift.myStatus && !shift.isFull}
					<span class="text-xs font-medium text-success">{freeLabel(shift.remaining)}</span>
				{/if}
			</span>

			<span class="ml-auto flex shrink-0 items-center gap-2">
				{#if shift.myStatus}
					<StatusBadge status={shift.myStatus} />
				{:else if shift.isFull}
					<StatusBadge status="full" />
				{/if}
				<ChevronDown
					size={16}
					class="shrink-0 text-ink-muted transition-transform {expanded ? 'rotate-180' : ''}"
				/>
			</span>
		</button>

		{#if canQuickSignup}
			<form
				method="POST"
				action="?/signup"
				use:enhance={signupEnhance("C'est noté, ce créneau est à toi")}
			>
				<input type="hidden" name="shiftId" value={shift.id} />
				<input type="hidden" name="status" value="available" />
				<button
					type="submit"
					onclick={guardOverlap}
					class="skin-glossy skin-secondary inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-2.5 text-sm font-semibold text-white"
				>
					<Check size={15} /> Je prends
				</button>
			</form>
		{:else if canLoginSignup && !shift.isFull}
			<a
				href="{resolve('/login')}?redirect={loginTarget('available')}"
				class="skin-glossy skin-secondary inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-2.5 text-sm font-semibold text-white"
			>
				<Check size={15} /> Je prends
			</a>
		{/if}
	</div>

	<!-- Chevauchement d'agenda : information, jamais un blocage (cf. $lib/overlap). -->
	{#if activeConflicts.length > 0}
		<div
			class="flex items-start gap-1.5 border-t border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink"
		>
			<TriangleAlert size={14} class="mt-px shrink-0 text-warning" />
			<p>
				<span class="font-semibold">Chevauche</span>
				{#each activeConflicts as c, i (c.shiftId)}{#if i > 0},
					{/if}{conflictLabel(c)}{/each}
			</p>
		</div>
	{/if}

	{#if expanded}
		<div class="flex flex-col gap-2 border-t border-border px-3 pt-2 pb-3">
			<!-- Consigne du poste. Uniquement en vue « par horaire » : en vue « par poste » elle est
			     déjà sous le titre du groupe, la répéter ici serait du bruit. -->
			{#if showPosition && positionDescription}
				<p class="text-sm whitespace-pre-line text-ink-muted">{positionDescription}</p>
			{/if}

			<!-- Places (détail) -->
			<p class="text-sm text-ink-muted">
				<span
					class:text-success={!shift.isFull}
					class:text-error={shift.isFull}
					class="font-medium"
				>
					{freeLabel(shift.remaining)} sur {shift.capacity}
				</span>
				{#if shift.maybeCount > 0}
					· {shift.maybeCount} peut-être
				{/if}
			</p>

			<!-- Inscrits -->
			{#if shift.signups.length > 0}
				<ul class="flex flex-col gap-1">
					{#each sortedSignups as su (su.userId)}
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
			{#if isLoggedIn && !past}
				<!-- Précision (contrainte, remarque) : proposée une fois inscrit, jamais avant — le
				     premier geste reste « Je prends ». -->
				{#if shift.myStatus !== null}
					{#if editingNote}
						<form
							method="POST"
							action="?/setNote"
							class="flex flex-col gap-1.5 pt-1"
							use:enhance={noteEnhance}
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<label class="flex flex-col gap-1 text-xs font-medium text-ink-muted">
								Précision (optionnel)
								<textarea
									name="note"
									bind:value={note}
									use:autofocus
									rows="2"
									maxlength="280"
									placeholder="ex : dès 18h, scoring uniquement…"
									class="min-h-8 resize-y rounded border border-surface-border px-2 py-1 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
								></textarea>
							</label>
							<div class="flex gap-2">
								<button
									type="submit"
									disabled={!noteDirty}
									class="inline-flex min-h-8 items-center gap-1 rounded border border-brand-primary/40 bg-brand-primary/5 px-2.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/10 disabled:pointer-events-none disabled:opacity-50"
								>
									Enregistrer
								</button>
								<button
									type="button"
									onclick={() => {
										note = shift.myNote ?? '';
										editingNote = false;
									}}
									class="inline-flex min-h-8 items-center rounded px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted"
								>
									Annuler
								</button>
							</div>
						</form>
					{:else if shift.myNote}
						<p class="flex items-start gap-2 text-sm text-ink">
							<span class="min-w-0 flex-1 whitespace-pre-line italic">« {shift.myNote} »</span>
							<button
								type="button"
								onclick={() => (editingNote = true)}
								class="shrink-0 text-xs font-medium text-brand-primary hover:underline"
							>
								Modifier
							</button>
						</p>
					{:else}
						<button
							type="button"
							onclick={() => (editingNote = true)}
							class="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
						>
							<Plus size={14} /> Ajouter une précision
						</button>
					{/if}
				{/if}

				<div class="flex flex-wrap gap-2 pt-1">
					{#if shift.myStatus === null}
						<form
							method="POST"
							action="?/signup"
							use:enhance={signupEnhance("C'est noté, ce créneau est à toi")}
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="available" />
							<button
								type="submit"
								onclick={guardOverlap}
								disabled={shift.isFull}
								class="skin-glossy skin-secondary inline-flex min-h-9 items-center gap-1 rounded px-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
							>
								<Check size={15} /> Je prends
							</button>
						</form>
						<form
							method="POST"
							action="?/signup"
							use:enhance={signupEnhance('Noté : peut-être disponible')}
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="maybe" />
							<button
								type="submit"
								onclick={guardOverlap}
								class="inline-flex min-h-9 items-center gap-1 rounded border border-border px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
							>
								<CircleHelp size={15} /> Peut-être
							</button>
						</form>
					{:else if shift.myStatus === 'maybe'}
						<form
							method="POST"
							action="?/changeStatus"
							use:enhance={signupEnhance('Disponibilité confirmée', 'Tu t’es retiré du créneau')}
							class="flex flex-wrap items-center gap-2"
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="available" />
							<input type="hidden" name="note" value={note} />
							<button
								type="submit"
								onclick={guardOverlap}
								disabled={shift.isFull}
								class="skin-glossy skin-secondary inline-flex min-h-9 items-center gap-1 rounded px-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
							>
								<Check size={15} /> Je confirme
							</button>
							{@render unregister()}
						</form>
					{:else}
						<form
							method="POST"
							action="?/changeStatus"
							use:enhance={signupEnhance('Passé en peut-être', 'Tu t’es retiré du créneau')}
							class="flex flex-wrap items-center gap-2"
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="maybe" />
							<input type="hidden" name="note" value={note} />
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
				{#if shift.myStatus !== 'available'}
					{@render maybeHint()}
				{/if}
				{#if formError}
					<p class="text-sm text-error">{formError}</p>
				{/if}
			{:else if canLoginSignup}
				<!-- Non connecté : les boutons mènent à la connexion, l'inscription suit au retour. -->
				<div class="flex flex-wrap gap-2 pt-1">
					{#if !shift.isFull}
						<a
							href="{resolve('/login')}?redirect={loginTarget('available')}"
							class="skin-glossy skin-secondary inline-flex min-h-9 items-center gap-1 rounded px-3 text-sm font-semibold text-white"
						>
							<Check size={15} /> Je prends
						</a>
					{/if}
					<a
						href="{resolve('/login')}?redirect={loginTarget('maybe')}"
						class="inline-flex min-h-9 items-center gap-1 rounded border border-border px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
					>
						<CircleHelp size={15} /> Peut-être
					</a>
				</div>
				{@render maybeHint()}
			{/if}
		</div>
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

{#snippet maybeHint()}
	<p class="text-xs text-ink-muted">
		« Peut-être » ne bloque pas de place — confirme dès que tu sais.
	</p>
{/snippet}
