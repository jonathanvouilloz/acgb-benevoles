<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '$lib/toast.svelte';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { REMINDER_LEAD_OPTIONS, reminderLeadLabel } from '$lib/reminders';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Délai du rappel court : vérité serveur (`data`) + override optimiste au clic (`pendingLead`).
	let pendingLead = $state<number | null>(null);
	let savingLead = $state(false);
	const leadMin = $derived(pendingLead ?? data.reminderLeadMin);
</script>

<svelte:head><title>Rappels — Bénévoles ACGB</title></svelte:head>

<h1 class="h1">Rappels</h1>
<p class="mt-1 text-sm text-ink-muted">
	Reçois une notification avant tes créneaux pour ne rien oublier.
</p>

<!-- Activation des notifications push -->
<section class="mt-6 flex flex-col gap-2">
	<h2 class="h2">Notifications</h2>
	<EnableNotifications />
</section>

<!-- Délai du rappel court (le rappel 24h avant reste systématique) -->
<section class="mt-8 flex flex-col gap-2">
	<h2 class="h2">Quand te prévenir</h2>
	<form
		method="POST"
		action="?/saveReminderLead"
		class="flex flex-col gap-1.5"
		use:enhance={({ formData }) => {
			savingLead = true;
			pendingLead = Number(formData.get('reminderLeadMin')); // optimiste
			return async ({ update, result }) => {
				await update({ reset: false });
				if (result.type === 'success') toast.success('Délai de rappel enregistré');
				else pendingLead = null; // échec → on retombe sur la valeur serveur
				savingLead = false;
			};
		}}
	>
		<span class="text-sm font-medium text-ink">Me prévenir avant le créneau</span>
		<div class="inline-flex overflow-hidden rounded-md border border-border" role="group">
			{#each REMINDER_LEAD_OPTIONS as opt, i (opt)}
				<button
					type="submit"
					name="reminderLeadMin"
					value={opt}
					disabled={savingLead}
					aria-pressed={leadMin === opt}
					class="px-3 py-1.5 text-sm transition disabled:opacity-60 {i > 0
						? 'border-l border-border'
						: ''} {leadMin === opt
						? 'bg-brand-primary font-medium text-white'
						: 'bg-surface text-ink hover:bg-surface-subtle'}"
				>
					{reminderLeadLabel(opt)}
				</button>
			{/each}
		</div>
		<span class="text-xs text-ink-muted">Un rappel 24 h avant t'est aussi envoyé.</span>
		{#if form && 'reminderError' in form && form.reminderError}
			<span class="text-xs text-error">{form.reminderError}</span>
		{/if}
	</form>
</section>
