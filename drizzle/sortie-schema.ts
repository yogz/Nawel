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

export const outingVibe = sortie.enum("outing_vibe", [
  "theatre",
  "opera",
  "concert",
  "cine",
  "expo",
  "autre",
]);

export const rsvpResponse = sortie.enum("rsvp_response", ["yes", "no", "handle_own", "interested"]);

export const pricingMode = sortie.enum("pricing_mode", ["unique", "category", "nominal"]);

export const paymentMethodType = sortie.enum("payment_method_type", [
  "lydia",
  "revolut",
  "wero",
  "iban",
]);

export const debtStatus = sortie.enum("debt_status", ["pending", "declared_paid", "confirmed"]);

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
    // When set, the outing is hidden from the creator's own profile lists
    // (/moi upcoming+past). Soft-archive — the outing itself still exists
    // and remains visible to attendees at its canonical URL. Distinct from
    // `showOnProfile` (which gates *public* profile visibility) and from
    // `cancelled` (which emails attendees). The UX split: swipe → archive,
    // detail-page button → cancel.
    hiddenFromProfileAt: timestamp("hidden_from_profile_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    // Stamped by the hourly sweeper once the J-1 reminder email has been sent,
    // so the cron can't double-send if it overlaps its own 1-hour window.
    reminderJ1SentAt: timestamp("reminder_j1_sent_at", { withTimezone: true }),
    // Poster / banner image for the event. Populated by the ticket-link
    // paster from the target page's `og:image`, or left null when the
    // creator types everything by hand. Stored as a URL (we don't rehost
    // the image — it's the ticket site's CDN).
    heroImageUrl: text("hero_image_url"),
    // 1200×630 JPEG re-encoded copy of `heroImageUrl`, hosted on Vercel
    // Blob, used by the OG image renderer. Pre-resized so the final
    // Satori PNG stays under WhatsApp's ~300 KB preview cliff. Null when
    // the source image was added before this column existed (the
    // renderer falls back on `heroImageUrl` in that case).
    heroImageOgUrl: text("hero_image_og_url"),
    // Cultural category captured at create time. Nullable to stay
    // compatible with all historical outings + to let the creator skip
    // the picker if they don't want to commit.
    vibe: outingVibe("vibe"),
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

// === purchaser_payment_methods ===

export const purchaserPaymentMethods = sortie.table(
  "purchaser_payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    type: paymentMethodType("type").notNull(),
    // AES-256-GCM ciphertext for IBAN or phone number.
    valueEncrypted: text("value_encrypted").notNull(),
    // Non-sensitive preview for the UI ("FR76 **** 1234" or "+33 6 ** ** ** 42").
    valuePreview: varchar("value_preview", { length: 80 }).notNull(),
    // Optional human label shown next to the method ("Lydia principal").
    displayLabel: varchar("display_label", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    participantIdx: index("sortie_payment_methods_participant_idx").on(t.participantId),
  })
);

// === purchases ===

export const purchases = sortie.table(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    purchaserParticipantId: uuid("purchaser_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    totalPlaces: integer("total_places").notNull(),
    pricingMode: pricingMode("pricing_mode").notNull(),
    // Populated iff pricingMode == "unique".
    uniquePriceCents: integer("unique_price_cents"),
    // Populated iff pricingMode == "category".
    adultPriceCents: integer("adult_price_cents"),
    childPriceCents: integer("child_price_cents"),
    // Preuve d'achat — Vercel Blob URL, set by Phase 3.B.
    proofFileUrl: text("proof_file_url"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    outingIdx: index("sortie_purchases_outing_idx").on(t.outingId),
    purchaserIdx: index("sortie_purchases_purchaser_idx").on(t.purchaserParticipantId),
  })
);

// === purchase_allocations ===

export const purchaseAllocations = sortie.table(
  "purchase_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    isChild: boolean("is_child").notNull().default(false),
    // Populated iff the parent purchase uses pricingMode == "nominal".
    nominalPriceCents: integer("nominal_price_cents"),
  },
  (t) => ({
    purchaseIdx: index("sortie_allocations_purchase_idx").on(t.purchaseId),
    participantIdx: index("sortie_allocations_participant_idx").on(t.participantId),
  })
);

// === debts ===

export const debts = sortie.table(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    debtorParticipantId: uuid("debtor_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    creditorParticipantId: uuid("creditor_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    status: debtStatus("status").notNull().default("pending"),
    declaredAt: timestamp("declared_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    outingIdx: index("sortie_debts_outing_idx").on(t.outingId),
    debtorIdx: index("sortie_debts_debtor_idx").on(t.debtorParticipantId),
    creditorIdx: index("sortie_debts_creditor_idx").on(t.creditorParticipantId),
  })
);

// === parse_stats (telemetry per-host pour le parser d'URL) ===

// Compteurs agrégés par hostname pour le scraper OG/JSON-LD de
// `/api/sortie/parse-ticket-url`. Permet de repérer les sites qui
// reviennent souvent en échec et de prioriser des parsers sur-mesure.
// Volonté : pas stocker l'URL complète des utilisateurs (privacy +
// éviter les tokens de partage qui traînent dans les paths). On garde
// juste le `path` du dernier échec, sans query string, comme indice.
export const parseStats = sortie.table("parse_stats", {
  // Hostname normalisé (lowercase, sans `www.`). RFC 1035 plafonne à 253.
  host: varchar("host", { length: 253 }).primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  // Page récupérée OK ET au moins un champ extrait (title/venue/image/
  // startsAt). C'est ce que le dashboard /sortie/stat appelle "OG
  // récupéré". Distinct de `attempts - zero_data - fetch_error` qui
  // serait équivalent mais demande le calcul à chaque lecture.
  successCount: integer("success_count").notNull().default(0),
  // Sous-ensemble de `successCount` : `og:image` ou `twitter:image`
  // extrait. Permet de mesurer le taux d'images trouvées par host
  // (utile pour repérer les sites qui ne ship pas d'OG image).
  imageFoundCount: integer("image_found_count").notNull().default(0),
  // Page récupérée OK mais aucun champ extrait (ni title, ni venue,
  // ni image, ni date). Le nombre qui compte pour repérer un site qui
  // mérite un parser dédié.
  zeroDataCount: integer("zero_data_count").notNull().default(0),
  // Tout ce qui empêche d'arriver à l'extraction : SSRF blocked,
  // timeout, non-2xx, content-type non-HTML, body vide.
  fetchErrorCount: integer("fetch_error_count").notNull().default(0),
  // Dernier échec, pour debug ponctuel sans avoir à lire les logs Vercel.
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  lastFailurePath: text("last_failure_path"),
  lastFailureKind: varchar("last_failure_kind", { length: 16 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// === service_call_stats (telemetry pour services externes globaux) ===

// Compteurs agrégés par service externe ET par source d'appel — Gemini
// `findEventDetails`, Ticketmaster `wizard-search`, `spellcheck`,
// `parse-enrich`, etc. La PK composite (service, source) permet de
// répondre à "combien d'appels TM viennent du wizard vs. du parser
// d'URL ?" sans tomber dans le table-per-call (privacy + volume).
//
// Les rows pré-existantes (pre-source) sont migrées avec source =
// 'legacy' : elles s'arrêtent d'être incrémentées dès que le code
// nouveau version est déployé, mais on les garde pour ne pas perdre
// l'historique cumulé.
export const serviceCallStats = sortie.table(
  "service_call_stats",
  {
    // Identifiant logique du service. "gemini" | "ticketmaster" pour le
    // moment — colonne libre pour ne pas avoir à muter un enum à chaque
    // nouveau service.
    service: varchar("service", { length: 32 }).notNull(),
    // Provenance de l'appel à l'intérieur du service. Convention :
    //   gemini       → "findEventDetails"
    //   ticketmaster → "wizard-search" | "spellcheck" | "parse-enrich"
    //   tout service → "legacy" (rows héritées de la v1 sans split)
    source: varchar("source", { length: 48 }).notNull(),
    callCount: integer("call_count").notNull().default(0),
    // Le service a renvoyé un résultat exploitable (Gemini : event trouvé
    // après validation ; Ticketmaster : au moins 1 event mappé). Distinct
    // de "appel sans erreur" — un 200 vide ne compte pas comme found.
    foundCount: integer("found_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    lastCalledAt: timestamp("last_called_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastErrorMessage: varchar("last_error_message", { length: 200 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.service, t.source] }),
  })
);

// === audit_log (append-only) ===

export const auditLog = sortie.table(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id").references(() => outings.id, { onDelete: "set null" }),
    actorParticipantId: uuid("actor_participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    // SHA-256 of the request IP + a per-run pepper — lets us spot repeated abuse
    // without retaining raw addresses.
    ipHash: varchar("ip_hash", { length: 64 }),
    // Before/after snapshots for sensitive actions (IBAN_REVEALED, DEBT_CONFIRMED).
    payload: text("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    outingIdx: index("sortie_audit_outing_idx").on(t.outingId),
    actionIdx: index("sortie_audit_action_idx").on(t.action),
  })
);

// === Relations ===

export const outingsRelations = relations(outings, ({ many, one }) => ({
  participants: many(participants),
  timeslots: many(outingTimeslots),
  magicLinks: many(magicLinks),
  purchases: many(purchases),
  debts: many(debts),
  creatorUser: one(user, {
    fields: [outings.creatorUserId],
    references: [user.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  outing: one(outings, { fields: [purchases.outingId], references: [outings.id] }),
  purchaser: one(participants, {
    fields: [purchases.purchaserParticipantId],
    references: [participants.id],
  }),
  allocations: many(purchaseAllocations),
}));

export const purchaseAllocationsRelations = relations(purchaseAllocations, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseAllocations.purchaseId],
    references: [purchases.id],
  }),
  participant: one(participants, {
    fields: [purchaseAllocations.participantId],
    references: [participants.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  outing: one(outings, { fields: [debts.outingId], references: [outings.id] }),
  debtor: one(participants, {
    fields: [debts.debtorParticipantId],
    references: [participants.id],
    relationName: "debtor",
  }),
  creditor: one(participants, {
    fields: [debts.creditorParticipantId],
    references: [participants.id],
    relationName: "creditor",
  }),
}));

export const purchaserPaymentMethodsRelations = relations(purchaserPaymentMethods, ({ one }) => ({
  participant: one(participants, {
    fields: [purchaserPaymentMethods.participantId],
    references: [participants.id],
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
