<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';
	import {
		Home,
		CalendarCheck,
		CalendarRange,
		Trophy,
		Shield,
		User,
		LogIn
	} from 'lucide-svelte';

	type NavUser = { role: string } | null;
	let { user, viewMode }: { user: NavUser; viewMode: 'organizer' | 'volunteer' } = $props();

	const volunteerView = $derived(viewMode === 'volunteer');
	const showOrgaNav = $derived(!!user && hasOrganizerAccess(user.role) && !volunteerView);
	const path = $derived(page.url.pathname);

	// Actif : correspondance exacte pour l'accueil, préfixe de segment sinon
	// (évite que /tournois matche /tournois-publics).
	const isActive = (href: string) =>
		href === '/' ? path === '/' : path === href || path.startsWith(href + '/');

	type Tab = { href: string; label: string; Icon: typeof Home };

	const tabs = $derived.by<Tab[]>(() => {
		if (!user) {
			return [
				{ href: resolve('/'), label: 'Accueil', Icon: Home },
				{ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange },
				{ href: resolve('/login'), label: 'Connexion', Icon: LogIn }
			];
		}

		const t: Tab[] = [
			volunteerView
				? { href: resolve('/'), label: 'Créneaux', Icon: CalendarCheck }
				: { href: resolve('/'), label: 'Accueil', Icon: Home }
		];

		if (showOrgaNav) {
			t.push({ href: resolve('/tournois'), label: 'Mes tournois', Icon: Trophy });
			if (isSuperAdmin(user.role)) {
				t.push({ href: resolve('/admin'), label: 'Admin', Icon: Shield });
			} else {
				t.push({ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange });
			}
		} else {
			t.push({ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange });
		}

		t.push({ href: resolve('/compte'), label: 'Compte', Icon: User });
		return t;
	});
</script>

<nav
	class="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden print:hidden"
	aria-label="Navigation principale"
>
	<div class="mx-auto flex w-full max-w-lg items-stretch">
		{#each tabs as tab (tab.href + tab.label)}
			{@const active = isActive(tab.href)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.68rem] font-medium transition
					{active ? 'text-brand-primary' : 'text-ink-muted'}"
			>
				<tab.Icon size={21} class="shrink-0" strokeWidth={active ? 2.25 : 1.75} />
				<span class="leading-none">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.bottom-nav {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>
