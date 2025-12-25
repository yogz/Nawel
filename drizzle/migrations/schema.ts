import { pgTable, index, foreignKey, serial, integer, text, real, varchar, timestamp, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const meals = pgTable("meals", {
	id: serial().primaryKey().notNull(),
	dayId: integer("day_id").notNull(),
	title: text().notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
}, (table) => [
	index("meals_day_id_idx").using("btree", table.dayId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.dayId],
			foreignColumns: [days.id],
			name: "meals_day_id_days_id_fk"
		}).onDelete("cascade"),
]);

export const items = pgTable("items", {
	id: serial().primaryKey().notNull(),
	mealId: integer("meal_id").notNull(),
	name: text().notNull(),
	quantity: text(),
	note: text(),
	personId: integer("person_id"),
	orderIndex: integer("order_index").default(0).notNull(),
	price: real(),
}, (table) => [
	index("items_meal_id_idx").using("btree", table.mealId.asc().nullsLast().op("int4_ops")),
	index("items_person_id_idx").using("btree", table.personId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.mealId],
			foreignColumns: [meals.id],
			name: "items_meal_id_meals_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [people.id],
			name: "items_person_id_people_id_fk"
		}).onDelete("set null"),
]);

export const days = pgTable("days", {
	id: serial().primaryKey().notNull(),
	date: varchar({ length: 50 }).notNull(),
	title: text(),
	eventId: integer("event_id").notNull(),
}, (table) => [
	index("days_event_id_idx").using("btree", table.eventId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "days_event_id_events_id_fk"
		}).onDelete("cascade"),
]);

export const people = pgTable("people", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	eventId: integer("event_id").notNull(),
	emoji: text(),
}, (table) => [
	index("people_event_id_idx").using("btree", table.eventId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "people_event_id_events_id_fk"
		}).onDelete("cascade"),
]);

export const changeLogs = pgTable("change_logs", {
	id: serial().primaryKey().notNull(),
	action: varchar({ length: 20 }).notNull(),
	tableName: varchar("table_name", { length: 50 }).notNull(),
	recordId: integer("record_id").notNull(),
	oldData: text("old_data"),
	newData: text("new_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	userIp: varchar("user_ip", { length: 100 }),
	userAgent: text("user_agent"),
	referer: text(),
});

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 100 }).notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	adminKey: varchar("admin_key", { length: 100 }),
}, (table) => [
	index("events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	unique("events_slug_unique").on(table.slug),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	idToken: text("id_token"),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("session_token_unique").on(table.token),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	role: text().default('user'),
	banned: boolean().default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const ingredients = pgTable("ingredients", {
	id: serial().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	name: text().notNull(),
	quantity: text(),
	checked: boolean().default(false).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
}, (table) => [
	index("ingredients_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "ingredients_item_id_items_id_fk"
		}).onDelete("cascade"),
]);
