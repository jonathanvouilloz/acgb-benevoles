<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		class?: string;
	}

	let { class: className = '', ...rest }: Props = $props();
</script>

<input
	class="min-h-11 w-full rounded border border-border bg-surface px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary {className}"
	{...rest}
/>
