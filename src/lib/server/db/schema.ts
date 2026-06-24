import { relations } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	text,
	boolean,
	integer,
	timestamp,
	uuid,
	unique
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

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	phone: text('phone'),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	isOrganizer: boolean('is_organizer').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
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

export const tournament = pgTable('tournament', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	location: text('location'),
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

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Tournament = typeof tournament.$inferSelect;
export type Position = typeof position.$inferSelect;
export type Shift = typeof shift.$inferSelect;
export type Signup = typeof signup.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
