<script lang="ts">
	import type { AssignmentLogRow } from '$lib/server/services/assignment-log-service';
	import { ChevronDown, UserPlus, UserMinus, ArrowRight, ArrowLeftRight } from 'lucide-svelte';

	let { history }: { history: AssignmentLogRow[] } = $props();

	let open = $state(false);

	/** Une action = une icône + un verbe + une couleur. Le tableau reste lisible en diagonale. */
	const META = {
		add: { label: 'Inscrit', icon: UserPlus, color: 'text-success' },
		remove: { label: 'Retiré', icon: UserMinus, color: 'text-error' },
		move: { label: 'Déplacé', icon: ArrowRight, color: 'text-brand-primary' },
		swap: { label: 'Échangé', icon: ArrowLeftRight, color: 'text-brand-primary' }
	} as const;

	const dateFmt = new Intl.DateTimeFormat('fr-CH', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
</script>

<!-- Repliée par défaut : c'est une pièce de contrôle, pas la vue de travail. -->
<section class="mx-auto mt-6 w-full max-w-5xl print:hidden">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
		aria-expanded={open}
	>
		<span class="text-sm font-semibold text-ink-strong">
			Historique des modifications
			<span class="ml-1 font-normal text-ink-muted">({history.length})</span>
		</span>
		<ChevronDown
			size={16}
			class="shrink-0 text-ink-muted transition-transform duration-150 {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		{#if history.length === 0}
			<p
				class="mt-2 rounded-lg border border-border bg-surface-subtle p-4 text-center text-sm text-ink-muted"
			>
				Aucune modification pour le moment. Les déplacements, échanges, inscriptions et retraits
				faits depuis la matrice apparaîtront ici.
			</p>
		{:else}
			<ul class="mt-2 overflow-hidden rounded-lg border border-border">
				{#each history as h (h.id)}
					{@const meta = META[h.action]}
					{@const Icon = meta.icon}
					<li
						class="flex flex-wrap items-start gap-x-2 gap-y-1 border-border px-4 py-2.5 text-sm not-first:border-t"
					>
						<Icon size={15} class="mt-0.5 shrink-0 {meta.color}" />
						<span class="font-medium text-ink-strong">{h.volunteerName}</span>
						<span class="text-ink-muted">{meta.label.toLowerCase()}</span>
						<span class="text-ink-muted">— {h.detail}</span>
						<span class="ml-auto whitespace-nowrap text-xs text-ink-muted/70">
							{dateFmt.format(h.createdAt)} · {h.actorName}
						</span>
						{#if h.reason}
							<p class="w-full pl-[23px] text-xs text-ink-muted italic">« {h.reason} »</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>
