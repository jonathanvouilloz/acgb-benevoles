<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import { roleLabel } from '$lib/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
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

<!-- Type de compte (lecture seule). La demande de promotion organisateur arrive en epic 9. -->
<div class="mt-8 rounded-lg border border-border bg-surface-subtle p-4">
	<p class="text-sm font-medium text-ink-strong">Type de compte</p>
	<p class="mt-1 text-sm text-ink-muted">
		Tu es <span class="font-medium text-ink">{roleLabel(data.role)}</span>.
	</p>
</div>
