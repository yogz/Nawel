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

export const ticketScope = sortie.enum("ticket_scope", ["participant", "outing"]);

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
    // Numéro "ticket" affiché en filigrane sur le poster ("№ 047 par
    // @camille"). Compteur incrémental par créateur — la 47ème sortie
    // organisée par ce user porte le numéro 47, figé pour toujours
    // même si une sortie antérieure est supprimée. Null pour les
    // créateurs anon (pas d'historique persistent → pas de compteur,
    // privilège des comptes loggés). Calculé via COUNT+1 à la création
    // (pas d'unique constraint : le rate-limit 5 créations/15 min
    // rend la race condition microscopique).
    creatorOutingNumber: integer("creator_outing_number"),
    // Bumpé à chaque transition de statut ou édition de contenu (titre,
    // date, lieu…). Sert exclusivement au flux iCal — RFC 5545 §3.8.7.4
    // exige un SEQUENCE incrémenté pour que les clients calendrier
    // (Apple, Outlook notamment) re-rendent leur copie locale au refresh
    // du feed. Sans bump, la transition open→awaiting_purchase ou
    // l'annulation d'une sortie reste invisible côté agenda abonné.
    sequence: integer("sequence").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // shortId a déjà un unique index implicite via .unique() — pas besoin
    // d'en re-déclarer un. (Drop de sortie_outings_short_id_idx hérité.)
    creatorUserIdx: index("sortie_outings_creator_user_idx").on(t.creatorUserId),
    creatorCookieIdx: index("sortie_outings_creator_cookie_idx").on(t.creatorCookieTokenHash),
    deadlineIdx: index("sortie_outings_deadline_idx").on(t.deadlineAt),
    // Index partiel sweeper "closing" — la majorité des sorties ne sont
    // pas open au moment du tick, on évite de scanner l'historique entier.
    closingIdx: index("sortie_outings_closing_idx")
      .on(t.status, t.deadlineAt)
      .where(sql`status = 'open'`),
    // Listings profil (4 fonctions partagent ce filtre) — composite sur
    // creator + status pour discriminer visibles vs annulées.
    profileListingIdx: index("sortie_outings_profile_listing_idx").on(t.creatorUserId, t.status),
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
    // Composite (outing_id, status) pour cedeAllocation et dashboards
    // dettes — outingIdx seul force un scan + filter sur status.
    outingStatusIdx: index("sortie_debts_outing_status_idx").on(t.outingId, t.status),
  })
);

// === tickets ===

// Fichiers de billet uploadés par l'organisateur. Le ciphertext AES-256-GCM
// vit sur Vercel Blob ; iv/authTag/keyId sont stockés ici, séparés. Une
// fuite de DB seule = ciphertext inaccessible (pas la clé). Une fuite de
// Blob seule = ciphertext sans metadata pour le déchiffrer. Les deux clés
// (env-side TICKET key + DB metadata) doivent fuiter pour exposer un
// billet.
//
// Deux scopes :
//   - 'participant' : billet nominatif (participantId NOT NULL)
//   - 'outing'      : billet groupé partagé par tous les participants
//                     "actifs" (response IN ('yes','handle_own')) — à enforcer
//                     côté ticket-auth, le schema seul ne le contraint pas
//
// L'invariant (scope, participantId) est validé côté action (zod
// discriminated union) ET côté DB (CHECK ajouté en migration manuelle —
// drizzle-kit ne génère pas les CHECK pour le moment).
//
// Authorization : l'organisateur de l'outing PEUT toujours accéder ;
// les participants accèdent selon leur scope match. Cf. ticket-auth.ts.
export const tickets = sortie.table(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    scope: ticketScope("scope").notNull(),
    // NULL ssi scope = 'outing'. CHECK constraint en DB enforce l'invariant.
    // Cascade delete : si le participant détenteur est supprimé, son billet
    // nominatif disparaît avec lui (cohérent — il n'y a plus de destinataire).
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "cascade",
    }),
    // Vercel Blob URL — ne JAMAIS exposer côté client. L'accès se fait
    // exclusivement via la route serveur /api/tickets/[id]/download qui
    // vérifie l'auth, déchiffre et stream avec Content-Disposition: attachment.
    blobUrl: text("blob_url").notNull(),
    // Nom de fichier original sanitisé (sanitizeStrictText). Réutilisé pour
    // construire le Content-Disposition au download. Optionnel : si absent,
    // on tombe sur "ticket-<shortId>.<ext>" généré côté serveur.
    originalFilename: varchar("original_filename", { length: 255 }),
    // MIME stocké (post-validation magic-byte). Pas le MIME déclaré par le
    // navigateur — celui-ci peut mentir. file-type sniffing fait foi.
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // SHA-256 du PLAINTEXT (avant chiffrement). Détecte une corruption ou
    // une altération du blob pendant le déchiffrement (le tag GCM détecte
    // déjà la falsification, mais le checksum couvre aussi le cas où on
    // ré-encrypte/migre les fichiers et qu'on veut vérifier l'identité).
    checksum: varchar("checksum", { length: 64 }).notNull(),
    // AES-256-GCM envelope (ciphertext sur Blob, ces 3 champs sur DB).
    encryptionKeyId: varchar("encryption_key_id", { length: 50 }).notNull(),
    iv: varchar("iv", { length: 32 }).notNull(), // base64url, 12 bytes décodés
    authTag: varchar("auth_tag", { length: 32 }).notNull(), // base64url, 16 bytes décodés
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Couvre les deux gros use cases : "billets de cette sortie" (page
    // organisateur) et filtre par scope ("uniquement les billets groupés").
    outingScopeIdx: index("sortie_tickets_outing_scope_idx").on(t.outingId, t.scope),
    participantIdx: index("sortie_tickets_participant_idx").on(t.participantId),
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

// === user_follows ===

// Relation non-symétrique follower → followed. PK composite couvre la
// lookup par follower (`isFollowing`, `listFollowedOutingsForCarousel`) ;
// l'index dédié sur `followed_user_id` couvre le sens inverse
// (`listFollowers`). Cascade des deux côtés : si l'un des users est
// supprimé, ses relations disparaissent (cohérent RGPD).
//
// Le portail d'entrée pour créer un follow est le `rsvpInviteToken` du
// followed (gate côté action serveur). Une fois la relation insérée,
// elle survit à la rotation du token — la table ne stocke pas le token.
export const userFollows = sortie.table(
  "user_follows",
  {
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followedUserId: text("followed_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerUserId, t.followedUserId] }),
    followedIdx: index("sortie_user_follows_followed_idx").on(t.followedUserId),
  })
);

// === Relations ===

export const outingsRelations = relations(outings, ({ many, one }) => ({
  participants: many(participants),
  timeslots: many(outingTimeslots),
  magicLinks: many(magicLinks),
  purchases: many(purchases),
  debts: many(debts),
  tickets: many(tickets),
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
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  outing: one(outings, {
    fields: [tickets.outingId],
    references: [outings.id],
  }),
  participant: one(participants, {
    fields: [tickets.participantId],
    references: [participants.id],
  }),
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
