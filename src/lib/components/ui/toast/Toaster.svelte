<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { Check, CircleAlert, TriangleAlert, Info, X } from 'lucide-svelte';
	import { slideDuration } from '$lib/motion';
	import { toasts, toast, type ToastType } from '$lib/toast.svelte';

	const icons = { success: Check, error: CircleAlert, warning: TriangleAlert, info: Info };
	const accent: Record<ToastType, string> = {
		success: 'text-success',
		error: 'text-error',
		warning: 'text-warning',
		info: 'text-info'
	};
</script>

<!-- Pile fixe bas de l'écran. z au-dessus des modales (z-50). pointer-events: les clics
     passent au travers des zones vides, seuls les toasts captent. -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
	role="status"
	aria-live="polite"
>
	{#each toasts.items as t (t.id)}
		{@const Icon = icons[t.type]}
		<div
			class="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-ink"
			style="box-shadow: var(--shadow-md)"
			in:fly={{ y: 14, duration: slideDuration }}
			out:fly={{ y: 14, duration: slideDuration }}
			animate:flip={{ duration: slideDuration }}
		>
			<Icon size={18} class="mt-0.5 shrink-0 {accent[t.type]}" />
			<p class="flex-1 leading-snug">{t.message}</p>
			<button
				type="button"
				onclick={() => toast.dismiss(t.id)}
				aria-label="Fermer"
				class="-mt-0.5 -mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-muted hover:text-ink"
			>
				<X size={15} />
			</button>
		</div>
	{/each}
</div>
