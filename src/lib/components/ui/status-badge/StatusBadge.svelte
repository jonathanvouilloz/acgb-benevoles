<script lang="ts">
	import { Check, CircleHelp, CircleX } from 'lucide-svelte';

	type Status = 'available' | 'maybe' | 'full';

	let { status, class: className = '' }: { status: Status; class?: string } = $props();

	const map = {
		available: { label: 'Disponible', icon: Check, cls: 'bg-success/15 text-success' },
		maybe: { label: 'Peut-être', icon: CircleHelp, cls: 'bg-warning/15 text-warning' },
		full: { label: 'Complet', icon: CircleX, cls: 'bg-error/15 text-error' }
	} as const;

	const meta = $derived(map[status]);
	const Icon = $derived(meta.icon);
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium {meta.cls} {className}"
>
	<Icon size={16} />
	{meta.label}
</span>
