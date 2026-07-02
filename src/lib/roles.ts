/**
 * Logique de rôles pure (client-safe — aucun import serveur).
 * Source de vérité de l'enum : `userRole` dans src/lib/server/db/schema.ts.
 * Réutilisée côté serveur par auth-guard et côté UI par la navbar / les pages.
 */
export type Role = 'volunteer' | 'organizer' | 'super_admin';

/** Accès organisateur = organizer OU super_admin (le super admin peut tout faire). */
export function hasOrganizerAccess(role: string | null | undefined): boolean {
	return role === 'organizer' || role === 'super_admin';
}

export function isSuperAdmin(role: string | null | undefined): boolean {
	return role === 'super_admin';
}

/** Libellé humain court du rôle (badge navbar, page compte, admin). */
export function roleLabel(role: string | null | undefined): string {
	switch (role) {
		case 'super_admin':
			return 'Administrateur';
		case 'organizer':
			return 'Organisateur';
		default:
			return 'Bénévole';
	}
}
