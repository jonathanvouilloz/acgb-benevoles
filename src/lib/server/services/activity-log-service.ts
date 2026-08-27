import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, tournament, user } from '$lib/server/db/schema';
import type { ActivityAction, ActivityLogRow, ActivityTargetType } from '$lib/activity-log';
import type { Role } from '$lib/roles';

/**
 * Journal d'activité d'un tournoi (Epic 16) — généralisation de `assignment_log` (Epic 14), né du
 * besoin d'Anne : « qu'on puisse également éliminer une tâche (en gardant une trace) » (2026-08-17).
 *
 * Deux principes hérités de l'epic 14, toujours valables et non négociables :
 *
 * 1. **Libellés dénormalisés à l'écriture** (`actorName`, `volunteerName`, `detail`) : la trace doit
 *    rester lisible après suppression du poste, du créneau ou du compte concerné. Une FK avec join à
 *    la lecture ferait disparaître l'entrée en même temps que l'objet qu'elle documente.
 * 2. **Écriture best-effort** : une erreur d'écriture de journal ne doit jamais faire échouer
 *    l'action métier qui vient de réussir en base — on perdrait la cohérence pour une ligne d'audit.
 *
 * Ce qui change avec l'epic 16 : le périmètre. On ne trace plus seulement les 4 opérations
 * d'affectation de l'organisateur, mais tout ce qui touche le tournoi, y compris les gestes des
 * bénévoles sur le lien public (`self_*`).
 */

export type ActivityLogEntry = {
	tournamentId: string;
	targetType: ActivityTargetType;
	action: ActivityAction;
	actorId: string;
	actorName: string;
	actorRole: Role;
	/** Personne concernée, s'il y en a une (créer un poste ne vise personne). */
	volunteerId?: string | null;
	volunteerName?: string | null;
	detail: string;
	reason?: string | null;
};

/** Écrit une entrée de journal. **Best-effort assumé** (cf. principe n°2 en tête de fichier). */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
	try {
		await db.insert(activityLog).values({
			tournamentId: entry.tournamentId,
			targetType: entry.targetType,
			action: entry.action,
			actorId: entry.actorId,
			actorName: entry.actorName,
			actorRole: entry.actorRole,
			volunteerId: entry.volunteerId ?? null,
			volunteerName: entry.volunteerName ?? null,
			detail: entry.detail,
			reason: entry.reason ?? null
		});
	} catch (err) {
		console.error('[activity-log] écriture échouée', err);
	}
}

/** Identité dénormalisée de l'auteur d'une action, figée dans la trace. */
export type Actor = { name: string; role: Role };

/**
 * Nom + rôle d'un utilisateur, pour figer l'acteur d'une entrée. Les valeurs de repli existent
 * parce qu'un journal amputé de son acteur vaut mieux qu'une action métier qui échoue.
 */
export async function getActor(userId: string): Promise<Actor> {
	const rows = await db
		.select({ name: user.name, role: user.role })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	const row = rows[0];
	return { name: row?.name ?? 'Utilisateur', role: (row?.role as Role) ?? 'volunteer' };
}

/**
 * Journal d'un tournoi, antéchronologique. Gardé par l'ownership : retourne une liste vide si le
 * tournoi n'appartient pas à `organizerId` — c'est cette jointure, et elle seule, qui empêche un
 * organisateur de lire le journal du tournoi d'un autre.
 */
export async function listActivityLog(
	tournamentId: string,
	organizerId: string,
	limit = 100
): Promise<ActivityLogRow[]> {
	const rows = await db
		.select({
			id: activityLog.id,
			targetType: activityLog.targetType,
			action: activityLog.action,
			actorName: activityLog.actorName,
			actorRole: activityLog.actorRole,
			volunteerName: activityLog.volunteerName,
			detail: activityLog.detail,
			reason: activityLog.reason,
			createdAt: activityLog.createdAt
		})
		.from(activityLog)
		.innerJoin(tournament, eq(activityLog.tournamentId, tournament.id))
		.where(and(eq(activityLog.tournamentId, tournamentId), eq(tournament.organizerId, organizerId)))
		.orderBy(desc(activityLog.createdAt))
		.limit(limit);

	return rows as ActivityLogRow[];
}
