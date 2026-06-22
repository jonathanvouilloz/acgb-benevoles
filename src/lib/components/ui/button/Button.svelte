<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		class?: string;
		children: Snippet;
	}

	let { variant = 'primary', class: className = '', children, ...rest }: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'bg-brand-primary text-white hover:bg-brand-primary-700',
		secondary: 'bg-brand-secondary text-white hover:brightness-95',
		ghost: 'bg-transparent text-ink hover:bg-surface-muted',
		danger: 'bg-error text-white hover:brightness-95'
	};
</script>

<button
	class="inline-flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:pointer-events-none disabled:opacity-50 {variants[
		variant
	]} {className}"
	{...rest}
>
	{@render children()}
</button>
