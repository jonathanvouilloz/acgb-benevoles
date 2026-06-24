<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'md' | 'sm';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'skin-glossy skin-primary',
		secondary: 'skin-glossy skin-secondary',
		ghost: 'bg-transparent text-ink hover:bg-surface-muted',
		danger: 'skin-glossy skin-danger'
	};

	const sizes: Record<Size, string> = {
		md: 'min-h-11 gap-2 rounded-lg px-4 text-sm',
		sm: 'min-h-8 gap-1.5 rounded px-3 text-sm'
	};
</script>

<button
	class="inline-flex items-center justify-center font-semibold transition duration-200 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 {sizes[
		size
	]} {variants[variant]} {className}"
	{...rest}
>
	{@render children()}
</button>
