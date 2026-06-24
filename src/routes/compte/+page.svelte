<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/toast.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
	let switchingRole = $state(false);
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
		Téléphone <span class="font-normal text-ink-muted">(optionnel)</span>
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

{#if data.prototype}
	<div class="mt-8 rounded-lg border border-warning/40 bg-warning/10 p-4">
		<p class="text-sm font-medium text-ink-strong">Mode démo — rôle</p>
		<p class="mt-1 text-sm text-ink-muted">
			Tu es actuellement <span class="font-medium text-ink"
				>{data.isOrganizer ? 'organisateur' : 'bénévole'}</span
			>. Bascule pour tester l'autre parcours.
		</p>
		<form
			method="POST"
			action="?/toggleRole"
			class="mt-3"
			use:enhance={() => {
				switchingRole = true;
				const wasOrganizer = data.isOrganizer;
				return async ({ update }) => {
					await update({ reset: false });
					await invalidateAll();
					toast.success(wasOrganizer ? 'Tu es maintenant bénévole' : 'Tu es maintenant organisateur');
					switchingRole = false;
				};
			}}
		>
			<Button type="submit" size="sm" variant="secondary" disabled={switchingRole}>
				{switchingRole
					? 'Bascule…'
					: data.isOrganizer
						? 'Passer en bénévole'
						: 'Passer en organisateur'}
			</Button>
		</form>
	</div>
{/if}
