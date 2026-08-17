import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { assignmentLog, tournament, type AssignmentAction } from '$lib/server/db/schema';

/**
 * Historique des modifications d'affectation faites par un organisateur (Epic 14) —
 * « qu'on puisse également éliminer une tâche (en gardant une trace) » (Anne, 2026-08-17).
 *
 * On trace les **quatre** opérations (add / remove / move / swap), pas seulement la suppression :
 * un historique qui ne montre que les retraits laisse croire qu'un bénévole a disparu alors
 * qu'il a été déplacé.
 *
 * Les libellés sont dénormalisés à l'écriture (`actorName`, `volunteerName`, `detail`) : la trace
 * doit rester lisible après suppression du poste, du créneau ou du compte concerné.
 */

export type AssignmentLogEntry = {
	tournamentId: string;
	action: AssignmentAction;
	actorId: string;
	actorName: string;
	volunteerId: string;
	volunteerName: string;
	detail: string;
	reason?: string | null;
};

/**
 * Écrit une entrée d'historique. **Best-effort assumé** : une erreur d'écriture de log ne doit
 * jamais faire échouer l'action métier qui vient de réussir en base — on perdrait la cohérence
 * (le bénévole est retiré) pour une ligne d'audit.
 */
export async function logAssignment(entry: AssignmentLogEntry): Promise<void> {
	try {
		await db.insert(assignmentLog).values({
			tournamentId: entry.tournamentId,
			action: entry.action,
			actorId: entry.actorId,
			actorName: entry.actorName,
			volunteerId: entry.volunteerId,
			volunteerName: entry.volunteerName,
			detail: entry.detail,
			reason: entry.reason ?? null
		});
	} catch (err) {
		console.error('[assignment-log] écriture échouée', err);
	}
}

export type AssignmentLogRow = {
	id: string;
	action: AssignmentAction;
	actorName: string;
	volunteerName: string;
	detail: string;
	reason: string | null;
	createdAt: Date;
};

/**
 * Historique d'un tournoi, antéchronologique. Gardé par l'ownership : retourne une liste vide
 * si le tournoi n'appartient pas à `organizerId` (jamais d'erreur — le `load` de /suivi a déjà
 * levé un 404 en amont dans ce cas).
 */
export async function listAssignmentLog(
	tournamentId: string,
	organizerId: string,
	limit = 100
): Promise<AssignmentLogRow[]> {
	return db
		.select({
			id: assignmentLog.id,
			action: assignmentLog.action,
			actorName: assignmentLog.actorName,
			volunteerName: assignmentLog.volunteerName,
			detail: assignmentLog.detail,
			reason: assignmentLog.reason,
			createdAt: assignmentLog.createdAt
		})
		.from(assignmentLog)
		.innerJoin(tournament, eq(assignmentLog.tournamentId, tournament.id))
		.where(
			and(eq(assignmentLog.tournamentId, tournamentId), eq(tournament.organizerId, organizerId))
		)
		.orderBy(desc(assignmentLog.createdAt))
		.limit(limit);
}
