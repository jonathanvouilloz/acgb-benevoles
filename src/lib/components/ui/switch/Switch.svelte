<script lang="ts">
	/** Interrupteur on/off accessible (role=switch). Libellé cliquable inclus. */
	let {
		checked = $bindable(false),
		label
	}: {
		checked?: boolean;
		label: string;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	onclick={() => (checked = !checked)}
	class="inline-flex items-center gap-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
>
	<span
		class="relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors {checked
			? 'bg-brand-primary'
			: 'bg-surface-muted'}"
	>
		<span
			class="absolute top-1/2 left-0.5 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform {checked
				? 'translate-x-4'
				: 'translate-x-0'}"
		></span>
	</span>
	{label}
</button>
