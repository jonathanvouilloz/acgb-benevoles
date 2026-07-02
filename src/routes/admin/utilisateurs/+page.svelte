<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import { toast } from '$lib/toast.svelte';
	import { roleLabel } from '$lib/roles';
	import { formatDay } from '$lib/format';
	import { Check, X, UserPlus } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);

	const roleOptions = [
		{ value: 'volunteer', label: 'Bénévole' },
		{ value: 'organizer', label: 'Organisateur' },
		{ value: 'super_admin', label: 'Administrateur' }
	];

	$effect(() => {
		if (form?.success === 'created') toast.success('Compte organisateur créé');
		else if (form?.success === 'promoted') toast.success('Compte promu organisateur');
		else if (form?.success === 'role') toast.success('Rôle mis à jour');
		else if (form?.success === 'approved') toast.success('Demande approuvée');
		else if (form?.success === 'rejected') toast.success('Demande refusée');
		else if (form && 'error' in form && form.error) toast.error(form.error);
	});
</script>

<svelte:head><title>Utilisateurs — Administration</title></svelte:head>

<h1 class="text-2xl font-bold text-ink-strong">Utilisateurs</h1>

<!-- Demandes de promotion organisateur en attente -->
{#if data.requests.length > 0}
	<section class="mt-6">
		<h2 class="text-sm font-semibold text-ink-strong">
			Demandes en attente ({data.requests.length})
		</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.requests as r (r.id)}
				<li class="rounded-lg border border-warning/40 bg-warning/10 p-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="font-medium text-ink-strong">{r.userName}</p>
							<p class="text-xs text-ink-muted">{r.userEmail}{r.userPhone ? ` · ${r.userPhone}` : ''}</p>
							{#if r.message}<p class="mt-1 text-sm text-ink">« {r.message} »</p>{/if}
						</div>
						<div class="flex items-center gap-2">
							<form method="POST" action="?/approve" use:enhance>
								<input type="hidden" name="requestId" value={r.id} />
								<Button type="submit" size="sm"><Check size={15} /> Approuver</Button>
							</form>
							<form method="POST" action="?/reject" use:enhance>
								<input type="hidden" name="requestId" value={r.id} />
								<Button type="submit" size="sm" variant="secondary"><X size={15} /> Refuser</Button>
							</form>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- Créer un compte organisateur -->
<section class="mt-8 rounded-lg border border-border bg-surface-subtle p-4">
	<h2 class="flex items-center gap-1.5 text-sm font-semibold text-ink-strong">
		<UserPlus size={16} /> Créer un compte organisateur
	</h2>
	<p class="mt-1 text-xs text-ink-muted">
		Si l'email existe déjà, le compte est simplement promu organisateur.
	</p>
	<form
		method="POST"
		action="?/createOrganizer"
		class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
		use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				await update();
				creating = false;
			};
		}}
	>
		<label class="flex flex-col gap-1 text-xs font-medium text-ink">
			Nom
			<Input name="name" type="text" value={form?.values?.name ?? ''} placeholder="Prénom Nom" />
			{#if form?.formErrors?.name}<span class="text-xs text-error">{form.formErrors.name[0]}</span>{/if}
		</label>
		<label class="flex flex-col gap-1 text-xs font-medium text-ink">
			Email
			<Input name="email" type="email" value={form?.values?.email ?? ''} placeholder="orga@acgb.ch" />
			{#if form?.formErrors?.email}<span class="text-xs text-error">{form.formErrors.email[0]}</span>{/if}
		</label>
		<div class="flex items-end">
			<Button type="submit" size="sm" disabled={creating}>
				{creating ? 'Création…' : 'Créer'}
			</Button>
		</div>
	</form>
</section>

<!-- Liste des utilisateurs -->
<section class="mt-8">
	<h2 class="text-sm font-semibold text-ink-strong">Tous les utilisateurs ({data.users.length})</h2>
	<ul class="mt-3 flex flex-col gap-2">
		{#each data.users as u (u.id)}
			<li class="rounded-lg border border-border bg-surface p-3">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="min-w-0">
						<p class="flex items-center gap-2 font-medium text-ink-strong">
							{u.name}
							<span class="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
								{roleLabel(u.role)}
							</span>
						</p>
						<p class="text-xs text-ink-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
						<p class="mt-0.5 text-xs text-ink-muted">
							{u.organizedCount} tournoi{u.organizedCount > 1 ? 's' : ''} organisé{u.organizedCount > 1 ? 's' : ''}
							· {u.signupCount} inscription{u.signupCount > 1 ? 's' : ''} · inscrit le {formatDay(u.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/setRole" class="flex items-center gap-2" use:enhance>
						<input type="hidden" name="userId" value={u.id} />
						<Select name="role" value={u.role} options={roleOptions} class="min-w-[9rem]" />
						<Button type="submit" size="sm" variant="secondary">Changer</Button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
</section>
