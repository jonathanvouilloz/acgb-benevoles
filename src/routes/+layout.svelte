<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/manrope';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="mx-auto min-h-dvh w-full max-w-[640px] px-4 py-6">
	{@render children()}
</div>
