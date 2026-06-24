<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import StatusBadge from '$lib/components/ui/status-badge/StatusBadge.svelte';
	import { formatDay, formatTimeRange } from '$lib/format';
	import { toast } from '$lib/toast.svelte';
	import { Check, CircleHelp, ChevronDown } from 'lucide-svelte';
	import type { VolunteerShift } from '$lib/server/services/signup-service';

	let {
		shift,
		isLoggedIn,
		myId,
		form,
		positionName = '',
		positionColor = '',
		past = false,
		featured = false,
		showPosition = true,
		showDay = true
	}: {
		shift: VolunteerShift;
		isLoggedIn: boolean;
		myId: string | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
		positionName?: string;
		positionColor?: string;
		past?: boolean;
		featured?: boolean;
		/** Affiche l'étiquette de poste sur la ligne (masquée quand on groupe déjà par poste). */
		showPosition?: boolean;
		/** Affiche le jour sur la ligne (masqué quand l'en-tête de groupe porte déjà le jour). */
		showDay?: boolean;
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

	/** Une action rapide « Je suis dispo » est proposée directement sur la ligne repliée. */
	const canQuickSignup = $derived(isLoggedIn && !past && shift.myStatus === null && !shift.isFull);

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
</script>

<div
	class="rounded border bg-surface transition-colors"
	class:border-border={!featured}
	class:border-brand-primary={featured}
	class:opacity-60={past}
	style={featured ? 'box-shadow: var(--shadow-sm)' : ''}
>
	<!-- En-tête compact (toujours visible) : déplie le détail. L'action rapide « dispo » est
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
			<span class="min-w-0 truncate text-sm text-ink">
				{#if showPosition && positionName}<span class="font-medium text-ink-strong"
						>{positionName}</span
					> ·
				{/if}{#if showDay}{formatDay(shift.startsAt)} ·
				{/if}{formatTimeRange(shift.startsAt, shift.endsAt)}
			</span>

			<span class="ml-auto flex shrink-0 items-center gap-2">
				{#if shift.myStatus}
					<StatusBadge status={shift.myStatus} />
				{:else if shift.isFull}
					<StatusBadge status="full" />
				{:else}
					<span class="text-xs font-medium text-success whitespace-nowrap">
						{shift.remaining}/{shift.capacity} dispo
					</span>
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
				use:enhance={signupEnhance('Tu es inscrit — disponible')}
			>
				<input type="hidden" name="shiftId" value={shift.id} />
				<input type="hidden" name="status" value="available" />
				<button
					type="submit"
					class="skin-glossy skin-secondary inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-2.5 text-sm font-semibold text-white"
				>
					<Check size={15} /> Dispo
				</button>
			</form>
		{/if}
	</div>

	{#if expanded}
		<div class="flex flex-col gap-2 border-t border-border px-3 pt-2 pb-3">
			<!-- Places (détail) -->
			<p class="text-sm text-ink-muted">
				<span
					class:text-success={!shift.isFull}
					class:text-error={shift.isFull}
					class="font-medium"
				>
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
			{#if isLoggedIn && !past}
				<!-- Note libre (précision / contrainte) -->
				<label class="flex flex-col gap-1 pt-1 text-xs font-medium text-ink-muted">
					Précision (optionnel)
					<textarea
						bind:value={note}
						rows="1"
						maxlength="280"
						placeholder="ex : dès 18h, scoring uniquement…"
						class="min-h-8 resize-y rounded border border-surface-border px-2 py-1 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
					></textarea>
				</label>

				{#if shift.myStatus !== null && noteDirty}
					<form method="POST" action="?/setNote" use:enhance={signupEnhance('Note enregistrée')}>
						<input type="hidden" name="shiftId" value={shift.id} />
						<input type="hidden" name="note" value={note} />
						<button
							type="submit"
							class="inline-flex min-h-8 items-center gap-1 rounded border border-brand-primary/40 bg-brand-primary/5 px-2.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/10"
						>
							Enregistrer la note
						</button>
					</form>
				{/if}

				<div class="flex flex-wrap gap-2 pt-1">
					{#if shift.myStatus === null}
						<form
							method="POST"
							action="?/signup"
							use:enhance={signupEnhance('Tu es inscrit — disponible')}
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="available" />
							<input type="hidden" name="note" value={note} />
							<button
								type="submit"
								disabled={shift.isFull}
								class="skin-glossy skin-secondary inline-flex min-h-9 items-center gap-1 rounded px-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
							>
								<Check size={15} /> Je suis dispo
							</button>
						</form>
						<form
							method="POST"
							action="?/signup"
							use:enhance={signupEnhance('Noté : peut-être disponible')}
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="maybe" />
							<input type="hidden" name="note" value={note} />
							<button
								type="submit"
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
						>
							<input type="hidden" name="shiftId" value={shift.id} />
							<input type="hidden" name="status" value="available" />
							<input type="hidden" name="note" value={note} />
							<button
								type="submit"
								disabled={shift.isFull}
								class="skin-glossy skin-secondary inline-flex min-h-9 items-center gap-1 rounded px-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
							>
								<Check size={15} /> Confirmer dispo
							</button>
							{@render unregister()}
						</form>
					{:else}
						<form
							method="POST"
							action="?/changeStatus"
							use:enhance={signupEnhance('Passé en peut-être', 'Tu t’es retiré du créneau')}
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
				{#if formError}
					<p class="text-sm text-error">{formError}</p>
				{/if}
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
