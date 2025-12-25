import { pgTable, serial, varchar, text, integer, timestamp, real, index, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// Better Auth Tables
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  })
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============================================
// Application Tables
// ============================================

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
    date: varchar("date", { length: 50 }).notNull(),
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
    peopleCount: integer("people_count").notNull().default(1),
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

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: text("quantity"),
    checked: boolean("checked").notNull().default(false),
    order: integer("order_index").notNull().default(0),
  },
  (table) => ({
    itemIdIdx: index("ingredients_item_id_idx").on(table.itemId),
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

export const itemRelations = relations(items, ({ one, many }) => ({
  meal: one(meals, {
    fields: [items.mealId],
    references: [meals.id],
  }),
  person: one(people, {
    fields: [items.personId],
    references: [people.id],
  }),
  ingredients: many(ingredients),
}));

export const ingredientRelations = relations(ingredients, ({ one }) => ({
  item: one(items, {
    fields: [ingredients.itemId],
    references: [items.id],
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

// Cache for AI-generated ingredients (to reduce API costs)
export const ingredientCache = pgTable(
  "ingredient_cache",
  {
    id: serial("id").primaryKey(),
    dishName: text("dish_name").notNull().unique(), // normalized (lowercase, trimmed)
    ingredients: text("ingredients").notNull(), // JSON array [{name, quantity}]
    baseServings: integer("base_servings").notNull().default(4), // number of servings for quantities
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(), // TTL - 30 days from creation
  },
  (table) => ({
    dishNameIdx: index("ingredient_cache_dish_name_idx").on(table.dishName),
    expiresAtIdx: index("ingredient_cache_expires_at_idx").on(table.expiresAt),
  })
);
