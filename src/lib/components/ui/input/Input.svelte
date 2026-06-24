<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		class?: string;
	}

	let { class: className = '', value = $bindable(), ...rest }: Props = $props();
</script>

<input
	bind:value
	class="min-h-8 w-full rounded border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary {className}"
	{...rest}
/>
