<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Option {
		value: string;
		label: string;
	}

	interface Props extends HTMLSelectAttributes {
		options?: Option[];
		class?: string;
	}

	let { options, class: className = '', value = $bindable(), children, ...rest }: Props = $props();
</script>

<div class="relative">
	<select
		bind:value
		class="min-h-8 w-full appearance-none rounded border border-border bg-surface px-3 pr-9 text-sm text-ink transition duration-150 hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary {className}"
		{...rest}
	>
		{#if options}
			{#each options as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		{:else}
			{@render children?.()}
		{/if}
	</select>
	<ChevronDown
		size={16}
		class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
	/>
</div>
