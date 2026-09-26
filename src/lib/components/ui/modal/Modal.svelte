<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { slideDuration } from '$lib/motion';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		/** `sheet` : collé en bas de l'écran sur mobile (panneau de filtres), centré au-delà. */
		variant?: 'dialog' | 'sheet';
		children: Snippet;
		/** Pied fixe (actions), hors de la zone qui défile. */
		footer?: Snippet;
	}

	let {
		open = $bindable(),
		title,
		onclose,
		variant = 'dialog',
		children,
		footer
	}: Props = $props();

	const isSheet = $derived(variant === 'sheet');

	// Mobile : le sheet monte du bas ; ailleurs, léger zoom comme la modale.
	function enter(node: Element) {
		return isSheet && window.matchMedia('(max-width: 639px)').matches
			? fly(node, { y: 240, duration: slideDuration })
			: scale(node, { duration: slideDuration, start: 0.97 });
	}

	function close() {
		open = false;
		onclose?.();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	// Verrou de scroll du body tant que la modale est ouverte.
	$effect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<svelte:window onkeydown={open ? onkeydown : undefined} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex justify-center {isSheet
			? 'items-end sm:items-center sm:p-4'
			: 'items-center p-4'}"
		role="presentation"
	>
		<button
			type="button"
			aria-label="Fermer"
			class="absolute inset-0 bg-ink-strong/40"
			onclick={close}
			transition:fade={{ duration: slideDuration }}
		></button>

		<div
			class="relative z-10 flex w-full max-w-md flex-col border border-border bg-surface p-4 {isSheet
				? 'max-h-[85dvh] rounded-t-lg pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-lg'
				: 'rounded-lg'}"
			style="box-shadow: var(--shadow-md)"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:enter
		>
			<div class="flex items-center justify-between gap-3">
				{#if title}<h2 class="h2">{title}</h2>{/if}
				<button
					type="button"
					onclick={close}
					aria-label="Fermer"
					class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
				>
					<X size={18} />
				</button>
			</div>
			<div class="mt-3 {isSheet ? 'min-h-0 flex-1 overflow-y-auto' : ''}">
				{@render children()}
			</div>
			{#if footer}
				<div class="mt-4 shrink-0">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
