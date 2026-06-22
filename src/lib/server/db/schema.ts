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
 * - `user.id` en `text` pour rester compatible avec Better Auth (Epic 2), qui en sera
 *   le propriétaire. Les tables `session` / `account` / `verification` seront générées
 *   par le CLI Better Auth en Epic 2 — NE PAS les ajouter ici.
 */

export const signupStatus = pgEnum('signup_status', ['available', 'maybe']);

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	emailVerified: boolean('email_verified').notNull().default(false),
	isOrganizer: boolean('is_organizer').notNull().default(false),
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
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [unique('signup_shift_user_unique').on(t.shiftId, t.userId)]
);

export const pushSubscription = pgTable('push_subscription', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export type User = typeof user.$inferSelect;
export type Tournament = typeof tournament.$inferSelect;
export type Position = typeof position.$inferSelect;
export type Shift = typeof shift.$inferSelect;
export type Signup = typeof signup.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
