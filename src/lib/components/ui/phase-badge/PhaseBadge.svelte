<script lang="ts">
	import { phaseLabel, type TournamentPhase } from '$lib/tournament-status';

	let { phase, class: className = '' }: { phase: TournamentPhase; class?: string } = $props();

	const cls = {
		upcoming: 'bg-brand-primary/10 text-brand-primary',
		ongoing: 'bg-success/15 text-success',
		past: 'bg-ink-muted/10 text-ink-muted'
	} as const;
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {cls[phase]} {className}"
>
	{phaseLabel(phase)}
</span>
