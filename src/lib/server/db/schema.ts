import { relations } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	text,
	boolean,
	integer,
	timestamp,
	uuid,
	unique,
	primaryKey,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';

/**
 * Schéma complet — Bénévoles ACGB (cf. docs/PRD.md §4).
 *
 * Conventions :
 * - PK domaine en `uuid` (defaultRandom) : non énumérable, sûr pour les liens publics.
 * - `user.id` en `text` pour rester compatible avec Better Auth (Epic 2), qui en est
 *   le propriétaire. Les tables `session` / `account` / `verification` sont alignées sur
 *   le schéma Drizzle de Better Auth (cf. docs/features/02-auth.md).
 */

export const signupStatus = pgEnum('signup_status', ['available', 'maybe']);

/**
 * Rôle applicatif (cf. docs/features/07-roles.md) :
 * - `volunteer` (défaut) : bénévole uniquement.
 * - `organizer` : accès orga ET bénévole (même compte, switch de vue côté UI).
 * - `super_admin` : tout + espace `/admin`.
 * La promotion `volunteer → organizer` passe par une demande validée par un super admin.
 * Le 1er super admin est promu manuellement en DB.
 */
export const userRole = pgEnum('user_role', ['volunteer', 'organizer', 'super_admin']);

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	phone: text('phone'),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	role: userRole('role').notNull().default('volunteer'),
	// Délai du rappel court configurable par le bénévole (Epic 6), en minutes avant le créneau.
	// Le rappel 24h reste fixe. Valeurs valides : cf. REMINDER_LEAD_OPTIONS ($lib/reminders).
	reminderLeadMin: integer('reminder_lead_min').notNull().default(30),
	/**
	 * Bénévole « géré » créé par un organisateur depuis la matrice (Epic 14). `null` = compte né
	 * d'une auto-inscription normale. Auto-référence → annotation `AnyPgColumn` requise.
	 */
	createdBy: text('created_by').references((): AnyPgColumn => user.id, { onDelete: 'set null' }),
	/**
	 * L'email est généré (`manuel-xxx@benevoles.acgb.local`), pas réel : ne JAMAIS y écrire
	 * (cf. garde dans services/email.ts). Le compte est une fiche visible de l'organisateur mais
	 * inerte côté bénévole (pas de connexion, pas de rappel). Repasse à `false` quand un vrai
	 * email est rattaché — le compte devient alors connectable sans perdre ses affectations.
	 */
	emailPlaceholder: boolean('email_placeholder').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Demande de promotion `volunteer → organizer` (cf. epics 8-9).
 * Traitée par un super admin depuis `/admin`. On conserve l'historique ; l'unicité d'une
 * demande `pending` par utilisateur est garantie applicativement (service), pas en DB.
 */
export const organizerRequestStatus = pgEnum('organizer_request_status', [
	'pending',
	'approved',
	'rejected'
]);

export const organizerRequest = pgTable('organizer_request', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	status: organizerRequestStatus('status').notNull().default('pending'),
	// Motivation libre saisie par le bénévole (optionnelle).
	message: text('message'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	// Super admin qui a tranché + horodatage (null tant que `pending`).
	reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
	reviewedAt: timestamp('reviewed_at')
});

/**
 * Tables Better Auth (magic link). Noms et colonnes alignés sur le schéma Drizzle
 * attendu par l'adapter. `verification` stocke les tokens de magic link.
 */

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Compteur de rate-limit générique (fenêtre fixe). Utilisé pour throttler l'envoi de
 * magic links (par email et par IP) car `auth.api.signInMagicLink` contourne le rate-limit
 * HTTP natif de Better Auth. Une ligne par `key` (ex. `magic:email:x@y`, `magic:ip:1.2.3.4`) ;
 * `expires_at` = fin de la fenêtre courante. Adossé à Postgres (et non à un compteur mémoire)
 * pour rester fiable sur serverless multi-instances (Vercel). Purge : lazy (réinitialisée à la
 * première requête après expiration) — aucune tâche de nettoyage requise au MVP.
 */
export const rateLimit = pgTable('rate_limit', {
	key: text('key').primaryKey(),
	count: integer('count').notNull().default(0),
	expiresAt: timestamp('expires_at').notNull()
});

export const tournament = pgTable('tournament', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	location: text('location'),
	// Consignes libres de l'organisateur, affichées en tête de la page d'inscription
	// (« minimum 6 h par bénévole », « laissez un commentaire »…). Texte brut, retours
	// à la ligne conservés à l'affichage.
	instructions: text('instructions'),
	// Brouillon tant que `false` : absent du listing public, mais le lien de partage reste
	// fonctionnel — c'est ce qui permet de tester un tournoi à quelques-uns avant de l'ouvrir.
	published: boolean('published').notNull().default(false),
	startDate: timestamp('start_date', { mode: 'date' }).notNull(),
	endDate: timestamp('end_date', { mode: 'date' }).notNull(),
	organizerId: text('organizer_id')
		.notNull()
		.references(() => user.id),
	shareToken: text('share_token').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const position = pgTable('position', {
	id: uuid('id').primaryKey().defaultRandom(),
	tournamentId: uuid('tournament_id')
		.notNull()
		.references(() => tournament.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	color: text('color').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const shift = pgTable('shift', {
	id: uuid('id').primaryKey().defaultRandom(),
	positionId: uuid('position_id')
		.notNull()
		.references(() => position.id, { onDelete: 'cascade' }),
	startsAt: timestamp('starts_at').notNull(),
	endsAt: timestamp('ends_at').notNull(),
	capacity: integer('capacity').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const signup = pgTable(
	'signup',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		shiftId: uuid('shift_id')
			.notNull()
			.references(() => shift.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		status: signupStatus('status').notNull(),
		// Note libre du bénévole (contrainte / précision : « dès 18h », « scoring uniquement »…).
		note: text('note'),
		// Rappels push (Epic 6) — horodatage du dernier envoi, garantit l'idempotence du cron
		// indépendamment de sa fréquence (cf. reminder-service). `null` = pas encore envoyé.
		reminder24SentAt: timestamp('reminder_24_sent_at'),
		reminder2SentAt: timestamp('reminder_2_sent_at'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [unique('signup_shift_user_unique').on(t.shiftId, t.userId)]
);

/**
 * État du récap email différé, une ligne par (bénévole, tournoi) — Epic 15.
 *
 * Mécanique de debounce, calquée sur la doctrine des rappels (`reminder-scheduler`) :
 * *planifier, jamais annuler, re-valider à la livraison*. Chaque changement incrémente
 * `revision` et publie un message QStash différé qui la porte ; à l'échéance, le message ne
 * part que s'il porte encore la révision courante. Cinq changements en trois minutes publient
 * cinq messages, quatre périment à la livraison, **un seul email part**.
 *
 * Ce n'est PAS une file d'attente balayée par un cron : c'est une table d'état. Les deux FK
 * cascadent, donc un compte ou un tournoi supprimé fait tomber le message en vol tout seul.
 */
export const signupDigest = pgTable(
	'signup_digest',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		/**
		 * Incrémentée à CHAQUE changement. Identité de fraîcheur du message, jamais une description
		 * du contenu : celui-ci est relu en base au moment de l'envoi.
		 */
		revision: integer('revision').notNull().default(0),
		/**
		 * Dernière révision réellement envoyée. Barrière anti double-envoi (QStash est at-least-once).
		 * `null` = jamais envoyé — indispensable pour distinguer un premier récap vide (à taire) d'une
		 * véritable désinscription (à annoncer).
		 */
		sentRevision: integer('sent_revision'),
		/** Le dernier changement vient-il de l'organisateur ? Ne sert qu'au ton de l'email. */
		byOrganizer: boolean('by_organizer').notNull().default(false),
		scheduledAt: timestamp('scheduled_at'),
		sentAt: timestamp('sent_at')
	},
	(t) => [primaryKey({ columns: [t.userId, t.tournamentId] })]
);

export type SignupDigest = typeof signupDigest.$inferSelect;

export const pushSubscription = pgTable(
	'push_subscription',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	// `endpoint` unique : permet l'upsert d'une re-souscription (même appareil) sans doublon.
	(t) => [unique('push_subscription_endpoint_unique').on(t.endpoint)]
);

/**
 * Trace des modifications d'affectation faites par un organisateur (Epic 14).
 * On trace les QUATRE opérations, pas seulement la suppression, sinon l'historique est borgne.
 */
export const assignmentAction = pgEnum('assignment_action', ['add', 'remove', 'move', 'swap']);

/**
 * Une ligne d'historique. Les libellés (`actorName`, `volunteerName`, `detail`) sont
 * **dénormalisés exprès** : la trace doit survivre à la suppression d'un poste, d'un créneau ou
 * d'un compte. Seul le tournoi cascade — si le tournoi disparaît, son historique n'a plus d'objet.
 */
export const assignmentLog = pgTable('assignment_log', {
	id: uuid('id').primaryKey().defaultRandom(),
	tournamentId: uuid('tournament_id')
		.notNull()
		.references(() => tournament.id, { onDelete: 'cascade' }),
	action: assignmentAction('action').notNull(),
	actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
	actorName: text('actor_name').notNull(),
	volunteerId: text('volunteer_id').references(() => user.id, { onDelete: 'set null' }),
	volunteerName: text('volunteer_name').notNull(),
	// Ex. « Buvette · sam. 10:00–14:00 → Entrée · sam. 14:00–18:00 ».
	detail: text('detail').notNull(),
	// Motif libre saisi par l'organisateur au retrait (optionnel).
	reason: text('reason'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

/**
 * Relations (niveau applicatif — aucune migration). Permettent les requêtes imbriquées
 * `db.query.tournament.findFirst({ with: { positions: { with: { shifts: true } } } })`
 * utilisées par la page de gestion organisateur (Epic 3).
 */
export const tournamentRelations = relations(tournament, ({ one, many }) => ({
	positions: many(position),
	// Organisateur (propriétaire) — permet d'exposer ses coordonnées aux bénévoles.
	organizer: one(user, {
		fields: [tournament.organizerId],
		references: [user.id]
	})
}));

export const positionRelations = relations(position, ({ one, many }) => ({
	tournament: one(tournament, {
		fields: [position.tournamentId],
		references: [tournament.id]
	}),
	shifts: many(shift)
}));

export const shiftRelations = relations(shift, ({ one, many }) => ({
	position: one(position, {
		fields: [shift.positionId],
		references: [position.id]
	}),
	signups: many(signup)
}));

export const signupRelations = relations(signup, ({ one }) => ({
	shift: one(shift, {
		fields: [signup.shiftId],
		references: [shift.id]
	}),
	user: one(user, {
		fields: [signup.userId],
		references: [user.id]
	})
}));

export const organizerRequestRelations = relations(organizerRequest, ({ one }) => ({
	// Demandeur (bénévole).
	user: one(user, {
		fields: [organizerRequest.userId],
		references: [user.id],
		relationName: 'requester'
	}),
	// Super admin qui a tranché.
	reviewer: one(user, {
		fields: [organizerRequest.reviewedBy],
		references: [user.id],
		relationName: 'reviewer'
	})
}));

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Tournament = typeof tournament.$inferSelect;
export type Position = typeof position.$inferSelect;
export type Shift = typeof shift.$inferSelect;
export type Signup = typeof signup.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
export type OrganizerRequest = typeof organizerRequest.$inferSelect;
export type RateLimit = typeof rateLimit.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type AssignmentLog = typeof assignmentLog.$inferSelect;
export type AssignmentAction = (typeof assignmentAction.enumValues)[number];
