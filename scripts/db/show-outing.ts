import * as dotenv from "dotenv";
dotenv.config();
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { outings } from "../../drizzle/sortie-schema";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/db/show-outing.ts <outing-uuid>");
    process.exit(1);
  }
  const o = await db.query.outings.findFirst({ where: eq(outings.id, id) });
  console.log(o);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
