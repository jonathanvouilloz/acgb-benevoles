<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import { slideDuration } from '$lib/motion';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children: Snippet;
	}

	let { open = $bindable(), title, onclose, children }: Props = $props();

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
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
		<button
			type="button"
			aria-label="Fermer"
			class="absolute inset-0 bg-ink-strong/40"
			onclick={close}
			transition:fade={{ duration: slideDuration }}
		></button>

		<div
			class="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-4"
			style="box-shadow: var(--shadow-md)"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:scale={{ duration: slideDuration, start: 0.97 }}
		>
			<div class="flex items-center justify-between gap-3">
				{#if title}<h2 class="text-lg font-semibold text-ink-strong">{title}</h2>{/if}
				<button
					type="button"
					onclick={close}
					aria-label="Fermer"
					class="inline-flex size-8 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
				>
					<X size={18} />
				</button>
			</div>
			<div class="mt-3">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
