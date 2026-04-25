import * as dotenv from "dotenv";
dotenv.config();

import { list, del } from "@vercel/blob";
import { isNotNull } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";

/**
 * Audit avatars in Vercel Blob that no longer have a `user.image` row
 * pointing at them. The inline cleanup in `updateAvatarAction` (#143)
 * stops *new* orphans; this script catches anything that slipped
 * through (failed deletes, pre-cleanup uploads from before the fix
 * shipped) plus the rare DB-write-fails-after-upload edge case from
 * `uploadPurchaseProof`.
 *
 * Usage:
 *   tsx scripts/db/audit-blob-orphans.ts            # dry run, prints counts
 *   tsx scripts/db/audit-blob-orphans.ts --apply    # actually delete
 *
 * Privacy: we only print counts and a sample size, never blob URLs.
 * URLs of orphaned files are still mildly identifying (UUID + ext)
 * and there's no good reason to surface them in CI / shell history.
 */

const AVATAR_PREFIX = "sortie/avatars/";
const BATCH_SIZE = 100;

type AuditOptions = {
  apply: boolean;
};

async function listAllBlobs(prefix: string): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      urls.push(blob.url);
    }
    cursor = page.cursor;
  } while (cursor);

  return urls;
}

async function loadReferencedAvatarUrls(): Promise<Set<string>> {
  const rows = await db
    .select({ image: user.image })
    .from(user)
    .where(isNotNull(user.image));

  const referenced = new Set<string>();
  for (const row of rows) {
    if (row.image) {
      referenced.add(row.image);
    }
  }
  return referenced;
}

async function deleteInBatches(urls: string[]): Promise<void> {
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    await del(batch);
    process.stdout.write(`  deleted ${Math.min(i + BATCH_SIZE, urls.length)} / ${urls.length}\r`);
  }
  process.stdout.write("\n");
}

async function audit({ apply }: AuditOptions): Promise<void> {
  console.log(`[audit] scanning ${AVATAR_PREFIX}`);
  const blobUrls = await listAllBlobs(AVATAR_PREFIX);
  console.log(`[audit] ${blobUrls.length} blob(s) under prefix`);

  console.log("[audit] loading referenced avatar URLs from DB");
  const referenced = await loadReferencedAvatarUrls();
  console.log(`[audit] ${referenced.size} URL(s) referenced by user.image`);

  const orphans = blobUrls.filter((url) => !referenced.has(url));
  console.log(`[audit] ${orphans.length} orphan(s) found`);

  if (orphans.length === 0) {
    console.log("[audit] nothing to do");
    return;
  }

  if (!apply) {
    console.log("[audit] dry run — pass --apply to actually delete");
    return;
  }

  console.log(`[audit] deleting ${orphans.length} orphan(s)`);
  await deleteInBatches(orphans);
  console.log("[audit] done");
}

if (require.main === module) {
  const apply = process.argv.includes("--apply");
  audit({ apply })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[audit] failed", err);
      process.exit(1);
    });
}

export { audit };
