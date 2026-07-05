/**
 * Modèle de navigation partagé entre la bottom bar (mobile/tablette) et la top bar
 * (desktop). Centralise `isActive` et la dérivation des onglets d'après le rôle et
 * le mode de vue, pour éviter la divergence entre les deux composants.
 *
 * Client-safe : aucun import serveur. Le type `AgendaItem` décrit la forme
 * (sérialisée, dates réhydratées) des créneaux exposés par `+layout.server.ts`.
 */
import { resolve } from '$app/paths';
import { hasOrganizerAccess, isSuperAdmin } from '$lib/roles';
import { Home, CalendarCheck, CalendarRange, Trophy, Shield, User, LogIn } from 'lucide-svelte';

export type NavUser = { role: string } | null;
export type ViewMode = 'organizer' | 'volunteer';
type IconComp = typeof Home;

/** Clé de badge portée par un onglet (compteur injecté par le composant). */
export type BadgeKey = 'imminent';

export type NavTab = { href: string; label: string; Icon: IconComp; badgeKey?: BadgeKey };

/** Un créneau à venir de l'utilisateur (forme client-safe pour le panneau cloche). */
export type AgendaItem = {
	shiftId: string;
	startsAt: Date;
	endsAt: Date;
	status: 'available' | 'maybe';
	positionName: string;
	positionColor: string;
	tournamentName: string;
	shareToken: string;
};

/** Actif : correspondance exacte pour l'accueil, préfixe de segment sinon (évite que /tournois matche /tournois-publics). */
export function isActive(path: string, href: string): boolean {
	return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

/**
 * Normalise le path pour le calcul de l'onglet actif : les pages détail sans onglet propre
 * sont rattachées à leur onglet parent, pour ne pas « perdre » la sélection dans la nav.
 * - `/t/[token]` (inscription bénévole) → « Tournois » (`/tournois-publics`).
 * - `/tournois/[id]` (gestion) matche déjà « Mes tournois » via le préfixe de segment → inchangé.
 */
export function navMatchPath(path: string): string {
	if (path === '/t' || path.startsWith('/t/')) return resolve('/tournois-publics');
	return path;
}

/**
 * Onglets de la bottom bar dérivés du rôle + de la vue (max 4 pour le super admin :
 * le « Tournois » public est retiré au profit d'« Admin »). Le premier onglet devient
 * « Créneaux » (avec badge) en vue bénévole, « Accueil » sinon.
 */
export function buildTabs(user: NavUser, viewMode: ViewMode): NavTab[] {
	if (!user) {
		return [
			{ href: resolve('/'), label: 'Accueil', Icon: Home },
			{ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange },
			{ href: resolve('/login'), label: 'Connexion', Icon: LogIn }
		];
	}

	const volunteerView = viewMode === 'volunteer';
	const showOrgaNav = hasOrganizerAccess(user.role) && !volunteerView;

	const tabs: NavTab[] = [
		volunteerView
			? { href: resolve('/'), label: 'Créneaux', Icon: CalendarCheck, badgeKey: 'imminent' }
			: { href: resolve('/'), label: 'Accueil', Icon: Home }
	];

	if (showOrgaNav) {
		tabs.push({ href: resolve('/tournois'), label: 'Mes tournois', Icon: Trophy });
		if (isSuperAdmin(user.role)) {
			tabs.push({ href: resolve('/admin'), label: 'Admin', Icon: Shield });
		} else {
			tabs.push({ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange });
		}
	} else {
		tabs.push({ href: resolve('/tournois-publics'), label: 'Tournois', Icon: CalendarRange });
	}

	tabs.push({ href: resolve('/compte'), label: 'Compte', Icon: User });
	return tabs;
}
