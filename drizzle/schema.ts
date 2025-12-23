import { pgTable, serial, varchar, text, integer, timestamp, real, index, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    adminKey: varchar("admin_key", { length: 100 }), // Nullable for migration
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("events_created_at_idx").on(table.createdAt),
  })
);

export const days = pgTable(
  "days",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    title: text("title"),
  },
  (table) => ({
    eventIdIdx: index("days_event_id_idx").on(table.eventId),
  })
);

export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    dayId: integer("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order_index").notNull().default(0),
  },
  (table) => ({
    dayIdIdx: index("meals_day_id_idx").on(table.dayId),
  })
);

export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji"),
  },
  (table) => ({
    eventIdIdx: index("people_event_id_idx").on(table.eventId),
  })
);

export const items = pgTable(
  "items",
  {
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
  },
  (table) => ({
    mealIdIdx: index("items_meal_id_idx").on(table.mealId),
    personIdIdx: index("items_person_id_idx").on(table.personId),
  })
);

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
