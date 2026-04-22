// Barrel module re-exporting the public (CoList) schema and the sortie pgSchema
// together, so Drizzle-kit generates migrations for both in one pass and the
// db instance in src/lib/db.ts has type-safe access to every table via
// `db.query.<table>`.

export * from "./schema";
export * from "./sortie-schema";
