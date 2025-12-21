import { pgTable, serial, varchar, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const days = pgTable("days", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  title: text("title"),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order_index").notNull().default(0),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  note: text("note"),
  price: real("price"),
  personId: integer("person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  order: integer("order_index").notNull().default(0),
});

export const eventRelations = relations(events, ({ many }) => ({
  days: many(days),
  people: many(people),
}));

export const dayRelations = relations(days, ({ one, many }) => ({
  event: one(events, {
    fields: [days.eventId],
    references: [events.id],
  }),
  meals: many(meals),
}));

export const mealRelations = relations(meals, ({ one, many }) => ({
  day: one(days, {
    fields: [meals.dayId],
    references: [days.id],
  }),
  items: many(items),
}));

export const itemRelations = relations(items, ({ one }) => ({
  meal: one(meals, {
    fields: [items.mealId],
    references: [meals.id],
  }),
  person: one(people, {
    fields: [items.personId],
    references: [people.id],
  }),
}));

export const personRelations = relations(people, ({ one, many }) => ({
  event: one(events, {
    fields: [people.eventId],
    references: [events.id],
  }),
  items: many(items),
}));

export const changeLogs = pgTable("change_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 20 }).notNull(), // 'create', 'update', 'delete'
  tableName: varchar("table_name", { length: 50 }).notNull(), // 'items', 'meals', 'people', 'days'
  recordId: integer("record_id").notNull(),
  oldData: text("old_data"), // JSON string of old data (for update/delete)
  newData: text("new_data"), // JSON string of new data (for create/update)
  userIp: varchar("user_ip", { length: 100 }),
  userAgent: text("user_agent"),
  referer: text("referer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
