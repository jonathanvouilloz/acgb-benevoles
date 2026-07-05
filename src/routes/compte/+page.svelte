<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import { roleLabel } from '$lib/roles';
	import { ShieldQuestion } from 'lucide-svelte';
	import EnableNotifications from '$lib/components/push/EnableNotifications.svelte';
	import { REMINDER_LEAD_OPTIONS, reminderLeadLabel } from '$lib/reminders';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
	let requesting = $state(false);
	// Délai du rappel court : vérité serveur (`data`) + override optimiste au clic (`pendingLead`).
	let pendingLead = $state<number | null>(null);
	let savingLead = $state(false);
	const leadMin = $derived(pendingLead ?? data.me.reminderLeadMin);

	const req = $derived(data.organizerRequest);
	// Un bénévole sans demande en cours (ni approuvée) peut soumettre une demande.
	const canRequest = $derived(data.role === 'volunteer' && req?.status !== 'pending');

	$effect(() => {
		if (form && 'requestSent' in form && form.requestSent) toast.success('Demande envoyée');
		else if (form && 'requestError' in form && form.requestError) toast.error(form.requestError);
	});
</script>

<svelte:head><title>Mon compte — Bénévoles ACGB</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">Mon compte</h1>
<p class="mt-1 text-sm text-ink-muted">Mets à jour ton nom et ton téléphone.</p>

<form
	method="POST"
	action="?/save"
	class="mt-6 flex flex-col gap-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update, result }) => {
			await update({ reset: false });
			if (result.type === 'success') toast.success('Modifications enregistrées');
			submitting = false;
		};
	}}
>
	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Nom
		<Input name="name" type="text" autocomplete="name" value={form?.values?.name ?? data.me.name} />
		{#if form?.errors?.name}<span class="text-xs text-error">{form.errors.name[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Téléphone
		<Input
			name="phone"
			type="tel"
			autocomplete="tel"
			inputmode="tel"
			placeholder="+41 79 123 45 67"
			value={form?.values?.phone ?? data.me.phone ?? ''}
		/>
		{#if form?.errors?.phone}<span class="text-xs text-error">{form.errors.phone[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-ink">
		Email
		<Input type="email" value={data.me.email} disabled class="opacity-70" />
		<span class="text-xs text-ink-muted">L'email ne peut pas être modifié.</span>
	</label>

	<Button type="submit" size="sm" disabled={submitting} class="mt-2">
		{submitting ? 'Enregistrement…' : 'Enregistrer'}
	</Button>
</form>

<!-- Rappels push : point d'activation global (cible du lien « Activer les rappels » de la cloche) -->
<section class="mt-8 flex flex-col gap-2">
	<p class="text-sm font-medium text-ink-strong">Rappels de créneaux</p>
	<p class="text-xs text-ink-muted">Reçois une notification avant tes créneaux pour ne rien oublier.</p>
	<EnableNotifications />

	<!-- Délai du rappel court (le rappel 24h avant reste systématique) -->
	<form
		method="POST"
		action="?/saveReminderLead"
		class="mt-2 flex flex-col gap-1.5"
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
		<span class="text-xs font-medium text-ink">Me prévenir avant le créneau</span>
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
	</form>
</section>

<!-- Type de compte + demande de promotion organisateur (bénévole uniquement) -->
<div class="mt-8 rounded-lg border border-border bg-surface-subtle p-4">
	<p class="text-sm font-medium text-ink-strong">Type de compte</p>
	<p class="mt-1 text-sm text-ink-muted">
		Tu es <span class="font-medium text-ink">{roleLabel(data.role)}</span>.
	</p>

	{#if data.role === 'volunteer'}
		{#if req?.status === 'pending'}
			<p class="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
				Ta demande pour devenir organisateur est <span class="font-medium">en attente</span> de
				validation.
			</p>
		{:else if req?.status === 'rejected'}
			<p class="mt-3 text-sm text-ink-muted">
				Ta précédente demande a été refusée. Tu peux en soumettre une nouvelle.
			</p>
		{/if}

		{#if canRequest}
			<form
				method="POST"
				action="?/requestOrganizer"
				class="mt-3 flex flex-col gap-2"
				use:enhance={() => {
					requesting = true;
					return async ({ update }) => {
						await update();
						requesting = false;
					};
				}}
			>
				<label class="flex flex-col gap-1 text-xs font-medium text-ink">
					Devenir organisateur — un mot pour l'association (optionnel)
					<textarea
						name="message"
						rows="2"
						maxlength="500"
						placeholder="Pourquoi souhaites-tu organiser des tournois ?"
						class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink transition hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
					></textarea>
				</label>
				<div>
					<Button type="submit" size="sm" variant="secondary" disabled={requesting}>
						<ShieldQuestion size={15} />
						{requesting ? 'Envoi…' : 'Demander à devenir organisateur'}
					</Button>
				</div>
			</form>
		{/if}
	{/if}
</div>
