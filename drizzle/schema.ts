import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  real,
  index,
  uniqueIndex,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================
// Better Auth Tables
// ============================================

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    emoji: text("emoji"),
    role: text("role").default("user"),
    language: text("language").default("fr"),
    // Optional Sortie handle — populated when the user picks one. Stored
    // lowercase; the URL slug at `/sortie/@<username>` reads this column
    // via a lower() match so visitors can type whatever case they want.
    username: text("username").unique(),
    // Private invite token that gates inline RSVP on the public profile page.
    // Null until the owner mints one from /moi; rotated/revoked at will. The
    // profile page matches `?k=<token>` server-side against this value and
    // never exposes it in rendered HTML.
    rsvpInviteToken: text("rsvp_invite_token"),
    // Token secret pour le flux iCal personnel — l'URL
    // `sortie.colist.fr/calendar/<calendarToken>.ics` retourne les
    // sorties RSVP yes/handle_own + créées par l'utilisateur. Pas
    // d'auth nécessaire au poll — le token EST le bearer. Null par
    // défaut, généré à la demande via /moi. Rotatable pour révoquer
    // un lien leaké.
    calendarToken: text("calendar_token").unique(),
    // Short free-text bio shown on the public profile (`/@<username>`).
    // Capped at 160 chars by the action schema — plenty for a one-liner,
    // short enough to stay readable on a 360px-wide viewport.
    bio: text("bio"),
    // Social handles stored without the `@` prefix and without the
    // surrounding URL. `instagramHandle = "noam"` → profil rendu pointe
    // vers https://instagram.com/noam. Max 30 chars (matches each
    // platform's actual limit + room for dots / underscores).
    instagramHandle: varchar("instagram_handle", { length: 30 }),
    tiktokHandle: varchar("tiktok_handle", { length: 30 }),
    // Opt-out global pour les emails « nouvelle sortie d'un user que tu suis ».
    // Default true : on opte-out, pas opte-in (le follow exprime déjà l'intérêt).
    // Le toggle vit dans /moi ; le lien one-click List-Unsubscribe des emails
    // bascule cette colonne via /sortie/unsubscribe?t=<HMAC token>.
    notifyOnFollowedOuting: boolean("notify_on_followed_outing").notNull().default(true),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    // Better Auth `twoFactor` plugin — flippé true à `enable`, false à `disable`.
    // Le secret + backup codes vivent dans la table `two_factor` dédiée.
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Indexes fonctionnels pour les lookups case-insensitive : profile/[username]
    // et reclaim-actions matchent sur lower(...). Sans ces indexes, le query
    // planner ignore le b-tree par défaut sur la colonne et fait un seq scan.
    emailLowerIdx: index("user_email_lower_idx").on(sql`lower(${t.email})`),
    usernameLowerIdx: index("user_username_lower_idx").on(sql`lower(${t.username})`),
  })
);

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
  people: many(people),
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

// Plugin Better Auth `twoFactor` — secret TOTP + backup codes par user.
// `verified` est flippé à true au moment où Better Auth confirme un premier
// code TOTP côté enrollment (skipVerificationOnEnable=false par défaut).
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
  },
  (t) => ({
    userIdIdx: index("two_factor_user_id_idx").on(t.userId),
    secretIdx: index("two_factor_secret_idx").on(t.secret),
  })
);

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
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
    time: varchar("time", { length: 20 }),
    address: text("address"),
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
    description: text("description"),
    order: integer("order_index").notNull().default(0),
    adults: integer("adults").notNull().default(0),
    children: integer("children").notNull().default(0),
    peopleCount: integer("people_count").notNull().default(0),
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
    image: text("image"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    status: text("status"), // 'confirmed', 'declined', 'maybe'
    guest_adults: integer("guest_adults").notNull().default(0), // Additional adults (excluding self)
    guest_children: integer("guest_children").notNull().default(0), // Children count
    token: uuid("token").defaultRandom(), // Secret token for anonymous modification
    // Expiration for `token`. NULL = legacy/no expiration (grandfathered).
    // New tokens default to 180 days (covers seasonal planning ahead of events);
    // validation treats NULL as valid.
    tokenExpiresAt: timestamp("token_expires_at").default(sql`now() + interval '180 days'`),
  },
  (table) => ({
    eventIdIdx: index("people_event_id_idx").on(table.eventId),
    userIdIdx: index("people_user_id_idx").on(table.userId),
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
    checked: boolean("checked").notNull().default(false),
    aiRating: integer("ai_rating"),
    cacheId: integer("cache_id").references(() => ingredientCache.id, { onDelete: "set null" }),
  },
  (table) => ({
    serviceIdIdx: index("items_service_id_idx").on(table.serviceId),
    personIdIdx: index("items_person_id_idx").on(table.personId),
    cacheIdIdx: index("items_cache_id_idx").on(table.cacheId),
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
    category: text("category"),
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
  user: one(user, {
    fields: [people.userId],
    references: [user.id],
  }),
}));

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
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on dishName + peopleCount
    dishPeopleIdx: index("ingredient_cache_dish_people_idx").on(table.dishName, table.peopleCount),
  })
);
// Cache for Gemini-grounded event lookups (sortie wizard fallback).
// Keyed by sha256(normalized_query) so identical queries from different
// users hit the same row and don't re-burn the daily Google quota.
export const eventLookupCache = pgTable(
  "event_lookup_cache",
  {
    id: serial("id").primaryKey(),
    queryHash: varchar("query_hash", { length: 64 }).notNull().unique(),
    query: text("query").notNull(),
    payload: text("payload").notNull(), // JSON-serialized FindEventResult
    sourcesCount: integer("sources_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    queryHashIdx: index("event_lookup_cache_query_hash_idx").on(table.queryHash),
    createdAtIdx: index("event_lookup_cache_created_at_idx").on(table.createdAt),
  })
);

// Daily counter of AI provider calls. We rely on the provider for the
// hard quota (HTTP 429), but keep this counter to surface usage trends
// in admin dashboards and to log a console.warn at 80% of free tier.
export const aiUsageDaily = pgTable(
  "ai_usage_daily",
  {
    id: serial("id").primaryKey(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    provider: varchar("provider", { length: 50 }).notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dateProviderIdx: uniqueIndex("ai_usage_daily_date_provider_idx").on(table.date, table.provider),
  })
);

// Feedback Table for bug reports and user feedback
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  personId: integer("person_id").references(() => people.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  email: text("email"),
  userAgent: text("user_agent"),
  url: text("url"), // Current URL where the bug was reported
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(user, {
    fields: [feedback.userId],
    references: [user.id],
  }),
  person: one(people, {
    fields: [feedback.personId],
    references: [people.id],
  }),
}));

export const costs = pgTable("costs", {
  id: serial("id").primaryKey(),
  amount: real("amount").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'hosting', 'domain', 'api', etc.
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
  frequency: varchar("frequency", { length: 20 }).notNull().default("once"), // 'once', 'monthly', 'yearly'
  isActive: boolean("is_active").notNull().default(true),
  stoppedAt: timestamp("stopped_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
