/**
 * Vocabulaire du journal d'activité (Epic 16) — **client-safe**, aucun import serveur.
 *
 * Source unique partagée par le service d'écriture, le `load` et l'UI. Le module existe pour deux
 * raisons : ne pas faire importer un module `$lib/server/*` par un composant (l'ancien
 * `AssignmentHistory.svelte` le faisait), et garder les libellés au même endroit que les codes.
 */
import {
	Trophy,
	MapPin,
	Clock,
	UserPlus,
	UserMinus,
	UserCog,
	ArrowRight,
	ArrowLeftRight,
	Eye,
	EyeOff,
	Pencil,
	Trash2,
	MessageSquare,
	HelpCircle
} from 'lucide-svelte';
import type { Role } from './roles';

/** Nature de l'objet touché. Sert aussi de filtre « catégorie » dans l'UI. */
export type ActivityTargetType = 'tournament' | 'position' | 'shift' | 'signup' | 'volunteer';

/**
 * Verbe de l'action. Les `self_*` sont les gestes du bénévole depuis le lien public — les
 * distinguer d'`assign`/`unassign` (gestes de l'organisateur) est tout l'intérêt du journal.
 *
 * Stocké en `text` en base, pas en enum PG : ajouter un événement tracé ne doit pas coûter une
 * migration. Le prix à payer est ce type, qui n'est vérifié qu'à la compilation.
 */
export type ActivityAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'publish'
	| 'unpublish'
	| 'assign'
	| 'unassign'
	| 'move'
	| 'swap'
	| 'self_join'
	| 'self_status'
	| 'self_note'
	| 'self_leave';

/** Une ligne telle qu'exposée à l'UI (le `load` la sérialise, les `Date` survivent). */
export type ActivityLogRow = {
	id: string;
	targetType: ActivityTargetType;
	/** `string` et non `ActivityAction` : une entrée écrite par une version plus récente doit s'afficher. */
	action: string;
	actorName: string;
	actorRole: Role;
	volunteerName: string | null;
	detail: string;
	reason: string | null;
	createdAt: Date;
};

type Meta = {
	/** Verbe au passé, sujet = l'acteur. Ex. « a créé le poste ». */
	label: string;
	icon: typeof Trophy;
	color: string;
};

/**
 * Libellé d'un événement, clé `${targetType}.${action}`. Un couple absent retombe sur
 * `FALLBACK` : le journal reste lisible même face à un code qu'il ne connaît pas.
 */
const META: Record<string, Meta> = {
	'tournament.create': { label: 'a créé le tournoi', icon: Trophy, color: 'text-success' },
	'tournament.update': { label: 'a modifié le tournoi', icon: Pencil, color: 'text-ink-muted' },
	'tournament.publish': { label: 'a publié le tournoi', icon: Eye, color: 'text-success' },
	'tournament.unpublish': {
		label: 'a repassé le tournoi en brouillon',
		icon: EyeOff,
		color: 'text-ink-muted'
	},

	'position.create': { label: 'a créé le poste', icon: MapPin, color: 'text-success' },
	'position.update': { label: 'a modifié le poste', icon: Pencil, color: 'text-ink-muted' },
	'position.delete': { label: 'a supprimé le poste', icon: Trash2, color: 'text-error' },

	'shift.create': { label: 'a créé le créneau', icon: Clock, color: 'text-success' },
	'shift.update': { label: 'a modifié le créneau', icon: Pencil, color: 'text-ink-muted' },
	'shift.delete': { label: 'a supprimé le créneau', icon: Trash2, color: 'text-error' },

	'signup.assign': { label: 'a inscrit', icon: UserPlus, color: 'text-success' },
	'signup.unassign': { label: 'a retiré', icon: UserMinus, color: 'text-error' },
	'signup.move': { label: 'a déplacé', icon: ArrowRight, color: 'text-brand-primary' },
	'signup.swap': { label: 'a échangé', icon: ArrowLeftRight, color: 'text-brand-primary' },
	'signup.self_join': { label: "s'est inscrit·e", icon: UserPlus, color: 'text-success' },
	'signup.self_status': { label: 'a changé son statut', icon: HelpCircle, color: 'text-ink-muted' },
	'signup.self_note': { label: 'a modifié sa note', icon: MessageSquare, color: 'text-ink-muted' },
	'signup.self_leave': { label: "s'est désinscrit·e", icon: UserMinus, color: 'text-error' },

	'volunteer.create': { label: 'a créé la fiche de', icon: UserCog, color: 'text-success' },
	'volunteer.update': { label: 'a modifié la fiche de', icon: UserCog, color: 'text-ink-muted' }
};

const FALLBACK: Meta = { label: 'a agi sur', icon: HelpCircle, color: 'text-ink-muted' };

export function activityMeta(targetType: string, action: string): Meta {
	return META[`${targetType}.${action}`] ?? FALLBACK;
}

/** Options du filtre « catégorie » de la page journal (l'ordre est celui de l'UI). */
export const TARGET_FILTERS = [
	{ value: 'all', label: 'Toutes les catégories' },
	{ value: 'tournament', label: 'Tournoi' },
	{ value: 'position', label: 'Postes' },
	{ value: 'shift', label: 'Créneaux' },
	{ value: 'signup', label: 'Inscriptions' },
	{ value: 'volunteer', label: 'Fiches bénévoles' }
] as const;

/** Options du filtre « auteur ». `volunteer` regroupe tout ce qui vient du lien public. */
export const ACTOR_FILTERS = [
	{ value: 'all', label: 'Tout le monde' },
	{ value: 'organizer', label: 'Organisateur' },
	{ value: 'volunteer', label: 'Bénévoles' }
] as const;
