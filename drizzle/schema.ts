import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  real,
  index,
  boolean,
} from "drizzle-orm/pg-core";
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
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    adults: integer("adults").notNull().default(0),
    children: integer("children").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("events_created_at_idx").on(table.createdAt),
    ownerIdIdx: index("events_owner_id_idx").on(table.ownerId),
  })
);

export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 50 }).notNull(),
    title: text("title"),
    adults: integer("adults").notNull().default(0),
    children: integer("children").notNull().default(0),
  },
  (table) => ({
    eventIdIdx: index("meals_event_id_idx").on(table.eventId),
  })
);

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order_index").notNull().default(0),
    peopleCount: integer("people_count").notNull().default(1),
  },
  (table) => ({
    mealIdIdx: index("services_meal_id_idx").on(table.mealId),
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
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
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
    serviceIdIdx: index("items_service_id_idx").on(table.serviceId),
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

export const eventRelations = relations(events, ({ one, many }) => ({
  meals: many(meals),
  people: many(people),
  owner: one(user, {
    fields: [events.ownerId],
    references: [user.id],
  }),
}));

export const mealRelations = relations(meals, ({ one, many }) => ({
  event: one(events, {
    fields: [meals.eventId],
    references: [events.id],
  }),
  services: many(services),
}));

export const serviceRelations = relations(services, ({ one, many }) => ({
  meal: one(meals, {
    fields: [services.mealId],
    references: [meals.id],
  }),
  items: many(items),
}));

export const itemRelations = relations(items, ({ one, many }) => ({
  service: one(services, {
    fields: [items.serviceId],
    references: [services.id],
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
// Key = dishName + peopleCount (e.g., "raclette" + 4 ≠ "raclette" + 6)
// Cache is only trusted after 3 consistent AI responses (confirmations >= 3)
export const ingredientCache = pgTable(
  "ingredient_cache",
  {
    id: serial("id").primaryKey(),
    dishName: text("dish_name").notNull(), // normalized (lowercase, trimmed)
    peopleCount: integer("people_count").notNull(), // number of servings
    ingredients: text("ingredients").notNull(), // JSON array [{name, quantity}]
    confirmations: integer("confirmations").notNull().default(1), // number of times AI returned same result
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on dishName + peopleCount
    dishPeopleIdx: index("ingredient_cache_dish_people_idx").on(table.dishName, table.peopleCount),
  })
);
