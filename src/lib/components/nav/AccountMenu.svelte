<script lang="ts">
	import { resolve } from '$app/paths';
	import { hasOrganizerAccess, roleLabel } from '$lib/roles';
	import { LogOut, User, Eye, ChevronRight } from 'lucide-svelte';

	type NavUser = { name?: string; email?: string; role: string } | null;
	let {
		user,
		viewMode,
		path
	}: { user: NavUser; viewMode: 'organizer' | 'volunteer'; path: string } = $props();

	let open = $state(false);

	const canSwitchView = $derived(!!user && hasOrganizerAccess(user.role));
	const volunteerView = $derived(viewMode === 'volunteer');
	const displayName = $derived(user?.name || user?.email || '');

	// Ferme le menu à chaque navigation.
	$effect(() => {
		void path;
		open = false;
	});
</script>

{#if user}
	<div class="relative">
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-full border border-border text-ink-muted transition hover:border-brand-primary hover:text-brand-primary
				{open ? 'border-brand-primary text-brand-primary' : ''}"
			aria-label="Compte"
			aria-haspopup="menu"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<User size={18} class="shrink-0" />
		</button>

		{#if open}
			<!-- Backdrop de fermeture -->
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default"
				aria-label="Fermer le menu"
				tabindex="-1"
				onclick={() => (open = false)}
			></button>

			<div
				class="account-panel absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-md"
				role="menu"
			>
				<!-- Identité -->
				<div class="border-b border-border px-3 py-2.5">
					<p class="truncate text-sm font-semibold text-ink-strong">{displayName}</p>
					<p class="mt-0.5 text-xs text-ink-muted">
						Rôle : <span class="font-medium text-ink">{roleLabel(user.role)}</span>
					</p>
				</div>

				<!-- Switch de vue (organisateurs / super admin) -->
				{#if canSwitchView}
					<form method="POST" action={resolve('/set-view')} class="border-b border-border">
						<input type="hidden" name="mode" value={volunteerView ? 'organizer' : 'volunteer'} />
						<input type="hidden" name="redirect" value={path} />
						<button
							type="submit"
							role="menuitem"
							class="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink transition hover:bg-surface-subtle"
						>
							<Eye size={16} class="shrink-0 text-ink-muted" />
							{volunteerView ? 'Revenir en organisateur' : 'Voir en bénévole'}
						</button>
					</form>
				{/if}

				<!-- Mon compte -->
				<a
					href={resolve('/compte')}
					role="menuitem"
					class="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-sm text-ink transition hover:bg-surface-subtle"
				>
					<span class="flex items-center gap-2">
						<User size={16} class="shrink-0 text-ink-muted" />
						Mon compte
					</span>
					<ChevronRight size={15} class="shrink-0 text-ink-muted" />
				</a>

				<!-- Déconnexion -->
				<form method="POST" action={resolve('/logout')}>
					<button
						type="submit"
						role="menuitem"
						class="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-error transition hover:bg-error/5"
					>
						<LogOut size={16} class="shrink-0" />
						Déconnexion
					</button>
				</form>
			</div>
		{/if}
	</div>
{:else}
	<a href={resolve('/login')} class="text-sm font-medium text-brand-primary underline">Connexion</a>
{/if}

<style>
	.account-panel {
		transform-origin: top right;
		animation: account-pop var(--dur-fast, 150ms) var(--ease-out-strong, ease-out);
	}
	@keyframes account-pop {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.account-panel {
			animation: none;
		}
	}
</style>
