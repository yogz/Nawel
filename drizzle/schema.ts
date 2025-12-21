import { pgTable, serial, varchar, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const days = pgTable("days", {
  id: serial("id").primaryKey(),
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
