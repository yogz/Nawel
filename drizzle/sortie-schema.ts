import {
  pgSchema,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  varchar,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./schema";

export const sortie = pgSchema("sortie");

// === Enums ===

export const outingStatus = sortie.enum("outing_status", [
  "open",
  "awaiting_purchase",
  "stale_purchase",
  "purchased",
  "past",
  "settled",
  "cancelled",
]);

export const outingMode = sortie.enum("outing_mode", ["fixed", "vote"]);

export const rsvpResponse = sortie.enum("rsvp_response", ["yes", "no", "handle_own", "interested"]);

// === outings ===

export const outings = sortie.table(
  "outings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortId: varchar("short_id", { length: 8 }).notNull().unique(),
    slug: varchar("slug", { length: 50 }).notNull(),
    creatorUserId: text("creator_user_id").references(() => user.id, { onDelete: "set null" }),
    creatorAnonName: varchar("creator_anon_name", { length: 100 }),
    creatorAnonEmail: varchar("creator_anon_email", { length: 255 }),
    // SHA-256 hash of the anon creator's device cookie. Lets the original
    // device edit the outing, and gets reset by a magic-link reclaim from
    // another device.
    creatorCookieTokenHash: varchar("creator_cookie_token_hash", { length: 64 }),
    title: varchar("title", { length: 200 }).notNull(),
    location: varchar("location", { length: 200 }),
    eventLink: text("event_link"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    mode: outingMode("mode").notNull().default("fixed"),
    fixedDatetime: timestamp("fixed_datetime", { withTimezone: true }),
    chosenTimeslotId: uuid("chosen_timeslot_id"),
    status: outingStatus("status").notNull().default("open"),
    showOnProfile: boolean("show_on_profile").notNull().default(true),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    shortIdIdx: index("sortie_outings_short_id_idx").on(t.shortId),
    creatorUserIdx: index("sortie_outings_creator_user_idx").on(t.creatorUserId),
    creatorCookieIdx: index("sortie_outings_creator_cookie_idx").on(t.creatorCookieTokenHash),
    deadlineIdx: index("sortie_outings_deadline_idx").on(t.deadlineAt),
  })
);

// === outing_timeslots ===

export const outingTimeslots = sortie.table(
  "outing_timeslots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    outingIdx: index("sortie_timeslots_outing_idx").on(t.outingId),
  })
);

// === participants ===

export const participants = sortie.table(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    anonName: varchar("anon_name", { length: 100 }),
    anonEmail: varchar("anon_email", { length: 255 }),
    // SHA-256 hash of the device cookie_token — the raw value only exists in the
    // HTTP-only cookie, never in the DB. Lookup: hash the cookie, compare to this.
    cookieTokenHash: varchar("cookie_token_hash", { length: 64 }).notNull(),
    cookieTokenExpiresAt: timestamp("cookie_token_expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '365 days'`),
    response: rsvpResponse("response").notNull(),
    extraAdults: integer("extra_adults").notNull().default(0),
    extraChildren: integer("extra_children").notNull().default(0),
    respondedAt: timestamp("responded_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    outingIdx: index("sortie_participants_outing_idx").on(t.outingId),
    cookieIdx: index("sortie_participants_cookie_idx").on(t.cookieTokenHash),
    userIdx: index("sortie_participants_user_idx").on(t.userId),
    uniqueCookiePerOuting: uniqueIndex("sortie_participants_outing_cookie_unique").on(
      t.outingId,
      t.cookieTokenHash
    ),
  })
);

// === timeslot_votes (composite PK) ===

export const timeslotVotes = sortie.table(
  "timeslot_votes",
  {
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    timeslotId: uuid("timeslot_id")
      .notNull()
      .references(() => outingTimeslots.id, { onDelete: "cascade" }),
    available: boolean("available").notNull().default(false),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.participantId, t.timeslotId] }),
  })
);

// === magic_links (anonymous creators re-claiming from another device) ===

export const magicLinks = sortie.table(
  "magic_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // SHA-256 hash of the token — raw token is only in the email URL.
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: index("sortie_magic_links_token_hash_idx").on(t.tokenHash),
    outingIdx: index("sortie_magic_links_outing_idx").on(t.outingId),
  })
);

// === Relations ===

export const outingsRelations = relations(outings, ({ many, one }) => ({
  participants: many(participants),
  timeslots: many(outingTimeslots),
  magicLinks: many(magicLinks),
  creatorUser: one(user, {
    fields: [outings.creatorUserId],
    references: [user.id],
  }),
}));

export const outingTimeslotsRelations = relations(outingTimeslots, ({ one, many }) => ({
  outing: one(outings, {
    fields: [outingTimeslots.outingId],
    references: [outings.id],
  }),
  votes: many(timeslotVotes),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  outing: one(outings, {
    fields: [participants.outingId],
    references: [outings.id],
  }),
  user: one(user, {
    fields: [participants.userId],
    references: [user.id],
  }),
  votes: many(timeslotVotes),
}));

export const timeslotVotesRelations = relations(timeslotVotes, ({ one }) => ({
  participant: one(participants, {
    fields: [timeslotVotes.participantId],
    references: [participants.id],
  }),
  timeslot: one(outingTimeslots, {
    fields: [timeslotVotes.timeslotId],
    references: [outingTimeslots.id],
  }),
}));

export const magicLinksRelations = relations(magicLinks, ({ one }) => ({
  outing: one(outings, {
    fields: [magicLinks.outingId],
    references: [outings.id],
  }),
}));
