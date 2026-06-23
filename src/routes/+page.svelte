<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-bold text-ink-strong">Bénévoles ACGB</h1>

{#if data.user?.isOrganizer}
	<p class="mt-2 text-ink-muted">Gère tes tournois, postes et créneaux.</p>
	<a href={resolve('/tournois')} class="mt-4 inline-block">
		<Button>Mes tournois</Button>
	</a>
{:else}
	<p class="mt-2 text-ink-muted">
		Socle technique en place. Voir le
		<a class="font-medium text-brand-primary underline" href={resolve('/styleguide')}>styleguide</a
		>.
	</p>
{/if}
