<script lang="ts">
	import { resolve } from '$app/paths';
	import { Eye, Repeat } from 'lucide-svelte';
	import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';

	/**
	 * Indicateur de vue active dans la top bar. Pour un compte à accès organisateur, c'est un
	 * bouton (form POST `/set-view`) qui bascule la vue courante en un clic (même mécanique que
	 * le switch du menu compte). Pour un bénévole simple, un label statique. Rien pour un invité.
	 */
	let {
		user,
		viewMode,
		path
	}: {
		user: { role: string } | null;
		viewMode: 'organizer' | 'volunteer';
		path: string;
	} = $props();

	const canSwitch = $derived(!!user && hasOrganizerAccess(user.role));
	const volunteerView = $derived(viewMode === 'volunteer');
	// Libellé de la vue courante : « Bénévole » en vue bénévole, sinon le rôle réel (Organisateur
	// / Admin) — c'est « ce que tu es en train de faire ».
	const label = $derived(
		volunteerView ? 'Bénévole' : user && isSuperAdmin(user.role) ? 'Admin' : 'Organisateur'
	);
</script>

{#if canSwitch}
	<form method="POST" action={resolve('/set-view')} class="shrink-0">
		<input type="hidden" name="mode" value={volunteerView ? 'organizer' : 'volunteer'} />
		<input type="hidden" name="redirect" value={path} />
		<button
			type="submit"
			class="group flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink transition hover:border-brand-primary hover:text-brand-primary"
			aria-label={volunteerView ? 'Revenir en vue organisateur' : 'Passer en vue bénévole'}
			title={volunteerView ? 'Revenir en vue organisateur' : 'Passer en vue bénévole'}
		>
			<Eye size={14} class="shrink-0 text-ink-muted group-hover:text-brand-primary" />
			<span>{label}</span>
			<Repeat size={12} class="shrink-0 text-ink-muted group-hover:text-brand-primary" />
		</button>
	</form>
{:else if user}
	<span
		class="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-muted"
	>
		<Eye size={14} class="shrink-0" />
		{label}
	</span>
{/if}
