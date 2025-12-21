import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const days = sqliteTable("days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date", { length: 10 }).notNull(),
  title: text("title"),
});

export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order_index").notNull().default(0),
});

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mealId: integer("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  note: text("note"),
  personId: integer("person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  order: integer("order_index").notNull().default(0),
});

export const dayRelations = relations(days, ({ many }) => ({
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

export const personRelations = relations(people, ({ many }) => ({
  items: many(items),
}));
