<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import { toast } from '$lib/toast.svelte';
	import { formatDay, formatTime } from '$lib/format';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import type { ShiftRef, VolunteerRef } from './assignment-types';
	import { Search, UserPlus, TriangleAlert, Check, Loader2 } from 'lucide-svelte';

	let {
		open = $bindable(false),
		tournament,
		target = null,
		volunteer = null,
		onclose
	}: {
		open?: boolean;
		tournament: VolunteerTournament;
		/** Créneau pré-sélectionné (clic sur une cellule vide ou sur « À pourvoir »). */
		target?: ShiftRef | null;
		/** Bénévole pré-sélectionné (clic sur une cellule vide d'une ligne existante). */
		volunteer?: VolunteerRef | null;
		onclose: () => void;
	} = $props();

	type SearchResult = {
		id: string;
		name: string;
		phoneMasked: string | null;
		isManaged: boolean;
		alreadyInTournament: boolean;
	};

	let mode = $state<'existing' | 'new'>('existing');
	let shiftId = $state('');
	let status = $state<'available' | 'maybe'>('available');
	let note = $state('');
	let submitting = $state(false);

	// Onglet « bénévole existant »
	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let searching = $state(false);
	let picked = $state<{ id: string; name: string } | null>(null);

	// Onglet « nouveau bénévole »
	let name = $state('');
	let phone = $state('');
	let email = $state('');

	/** Tous les créneaux du tournoi, à plat, avec leur état de remplissage. */
	const shiftOptions = $derived.by(() => {
		const out: { value: string; label: string }[] = [];
		for (const p of tournament.positions) {
			for (const s of p.shifts) {
				const places = s.isFull ? 'complet' : `${s.remaining} à pourvoir`;
				out.push({
					value: s.id,
					label: `${p.name} · ${formatDay(s.startsAt)} ${formatTime(s.startsAt)}–${formatTime(s.endsAt)} — ${places}`
				});
			}
		}
		return out;
	});

	const selectedShift = $derived.by(() => {
		for (const p of tournament.positions) {
			const s = p.shifts.find((x) => x.id === shiftId);
			if (s) return { position: p, shift: s };
		}
		return null;
	});

	/** Créneau complet + statut « disponible » → l'action échouera. On le dit avant. */
	const wouldBeFull = $derived(
		status === 'available' && selectedShift !== null && selectedShift.shift.isFull
	);

	/** Réinitialise le formulaire à chaque ouverture, en respectant la pré-sélection. */
	$effect(() => {
		if (!open) return;
		shiftId = target?.shiftId ?? shiftOptions[0]?.value ?? '';
		status = 'available';
		note = '';
		query = '';
		results = [];
		name = '';
		phone = '';
		email = '';
		if (volunteer) {
			mode = 'existing';
			picked = { id: volunteer.userId, name: volunteer.name };
		} else {
			mode = 'existing';
			picked = null;
		}
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	/** Recherche débouncée (250 ms) : une requête par pause de frappe, pas par touche. */
	function onQueryInput() {
		picked = null;
		clearTimeout(searchTimer);
		const q = query.trim();
		if (q.length < 2) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		searchTimer = setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/volunteers/search?tournamentId=${tournament.id}&q=${encodeURIComponent(q)}`
				);
				results = res.ok ? ((await res.json()).results ?? []) : [];
			} catch {
				results = [];
			} finally {
				searching = false;
			}
		}, 250);
	}

	const canSubmit = $derived(
		shiftId !== '' &&
			(mode === 'existing' ? picked !== null : name.trim() !== '' && phone.trim() !== '')
	);
</script>

<Modal bind:open title="Inscrire un bénévole" {onclose}>
	<!-- Onglets : compte existant / nouvelle fiche -->
	<div class="mt-3 flex overflow-hidden rounded border border-border">
		{#each [{ v: 'existing' as const, l: 'Bénévole existant' }, { v: 'new' as const, l: 'Nouveau bénévole' }] as tab (tab.v)}
			<button
				type="button"
				onclick={() => (mode = tab.v)}
				class="flex-1 px-3 py-1.5 text-sm font-medium transition duration-150 not-first:border-l not-first:border-border {mode ===
				tab.v
					? 'skin-glossy skin-primary text-white'
					: 'bg-surface text-ink-muted hover:bg-surface-muted'}"
			>
				{tab.l}
			</button>
		{/each}
	</div>

	<form
		method="POST"
		action="?/assign"
		class="mt-4 flex flex-col gap-3"
		use:enhance={() => {
			submitting = true;
			return async ({ result }) => {
				submitting = false;
				if (result.type === 'success') {
					await invalidateAll();
					const d = result.data as { notified?: boolean; hasRealEmail?: boolean } | undefined;
					// On ne dit « inscrit » sec que si la personne a réellement été touchée.
					if (d?.hasRealEmail === false) {
						toast.success(
							'Bénévole inscrit — sans email, il n’apparaîtra que dans votre tableau. Prévenez-le directement.'
						);
					} else if (d?.notified === false) {
						toast.success("Bénévole inscrit — il n'a pas de notification active, prévenez-le.");
					} else {
						toast.success('Bénévole inscrit et prévenu');
					}
					onclose();
				} else if (result.type === 'failure') {
					toast.error((result.data?.formError as string | undefined) ?? 'Action impossible.');
				}
			};
		}}
	>
		<input type="hidden" name="mode" value={mode} />

		<!-- Créneau -->
		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium text-ink-strong">Créneau</span>
			<Select bind:value={shiftId} name="shiftId" options={shiftOptions} required />
		</label>

		{#if mode === 'existing'}
			<!-- Recherche d'un compte existant -->
			<div class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Bénévole</span>
				{#if picked}
					<div
						class="flex items-center justify-between gap-2 rounded border border-brand-primary/40 bg-brand-primary/5 px-3 py-2 text-sm"
					>
						<span class="flex items-center gap-1.5 font-medium text-ink-strong">
							<Check size={15} class="text-brand-primary" />
							{picked.name}
						</span>
						<button
							type="button"
							onclick={() => {
								picked = null;
								query = '';
								results = [];
							}}
							class="text-xs text-ink-muted underline hover:text-ink"
						>
							changer
						</button>
					</div>
					<input type="hidden" name="userId" value={picked.id} />
				{:else}
					<div class="relative">
						<Search
							size={15}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
						/>
						<Input
							type="search"
							placeholder="Nom ou email…"
							bind:value={query}
							oninput={onQueryInput}
							class="pl-9"
						/>
						{#if searching}
							<Loader2
								size={15}
								class="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-muted"
							/>
						{/if}
					</div>

					{#if results.length > 0}
						<ul class="mt-1 max-h-48 overflow-auto rounded border border-border">
							{#each results as r (r.id)}
								<li class="not-first:border-t not-first:border-border">
									<button
										type="button"
										onclick={() => (picked = { id: r.id, name: r.name })}
										class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
									>
										<span class="min-w-0">
											<span class="block truncate font-medium text-ink-strong">{r.name}</span>
											{#if r.phoneMasked}
												<span class="text-xs text-ink-muted">{r.phoneMasked}</span>
											{/if}
										</span>
										<span class="flex shrink-0 flex-col items-end gap-0.5 text-xs">
											{#if r.alreadyInTournament}
												<span class="rounded bg-success/15 px-1.5 py-0.5 text-success">
													sur ce tournoi
												</span>
											{/if}
											{#if r.isManaged}
												<span class="rounded bg-warning/15 px-1.5 py-0.5 text-warning">
													hors app
												</span>
											{/if}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else if query.trim().length >= 2 && !searching}
						<p class="mt-1 text-xs text-ink-muted">
							Aucun compte trouvé. Utilise l'onglet « Nouveau bénévole ».
						</p>
					{/if}
				{/if}
			</div>
		{:else}
			<!-- Création d'une fiche -->
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Nom complet</span>
				<Input name="name" bind:value={name} placeholder="Noélie Dupont" required maxlength={100} />
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">Téléphone</span>
				<Input name="phone" bind:value={phone} type="tel" placeholder="079 123 45 67" required />
			</label>

			<!-- L'email est le champ décisif : avec lui la personne pourra se connecter et
			     retrouvera ses créneaux ; sans lui, la fiche n'existe que dans ce tableau. -->
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-ink-strong">
					Email <span class="font-normal text-ink-muted">(facultatif, mais recommandé)</span>
				</span>
				<Input name="email" bind:value={email} type="email" placeholder="noelie@example.ch" />
			</label>

			{#if email.trim() === ''}
				<p
					class="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink"
				>
					<TriangleAlert size={14} class="mt-0.5 shrink-0 text-warning" />
					<span>
						Sans email, ce bénévole n'apparaîtra que dans <strong>votre tableau</strong> : il ne pourra
						pas se connecter, ne verra pas ses créneaux et ne recevra aucun rappel. Vous pourrez ajouter
						son email plus tard sans perdre ses affectations.
					</span>
				</p>
			{:else}
				<p class="text-xs text-ink-muted">
					À sa première connexion avec cet email, ce bénévole retrouvera les créneaux que vous lui
					avez attribués.
				</p>
			{/if}
		{/if}

		<!-- Statut + note -->
		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium text-ink-strong">Statut</span>
			<Select
				bind:value={status}
				name="status"
				options={[
					{ value: 'available', label: 'Disponible (occupe une place)' },
					{ value: 'maybe', label: 'Peut-être (n’occupe pas de place)' }
				]}
			/>
		</label>

		{#if wouldBeFull}
			<p
				class="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink"
			>
				<TriangleAlert size={14} class="mt-0.5 shrink-0 text-warning" />
				<span>
					Ce créneau est complet. Choisis « Peut-être », un autre créneau, ou retire d'abord
					quelqu'un.
				</span>
			</p>
		{/if}

		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium text-ink-strong">
				Note <span class="font-normal text-ink-muted">(facultatif)</span>
			</span>
			<Input
				name="note"
				bind:value={note}
				placeholder="dès 18h, scoring uniquement…"
				maxlength={280}
			/>
		</label>

		<div class="mt-1 flex justify-end gap-2">
			<Button type="button" variant="ghost" size="sm" onclick={onclose} disabled={submitting}>
				Annuler
			</Button>
			<Button type="submit" size="sm" disabled={submitting || !canSubmit || wouldBeFull}>
				<UserPlus size={15} />
				{submitting ? 'En cours…' : 'Inscrire'}
			</Button>
		</div>
	</form>
</Modal>
