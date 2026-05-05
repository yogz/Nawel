import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

async function main() {
  const [{ total }] = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total FROM "user"
  `;

  const [{ silent }] = await sql<{ silent: number }[]>`
    SELECT count(*)::int AS silent
    FROM "user" u
    WHERE u.email_verified = false
      AND NOT EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id)
  `;

  const [{ silentOld }] = await sql<{ silentOld: number }[]>`
    SELECT count(*)::int AS "silentOld"
    FROM "user" u
    WHERE u.email_verified = false
      AND u.created_at < now() - interval '90 days'
      AND NOT EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM session s WHERE s.user_id = u.id)
  `;

  const [{ size }] = await sql<{ size: string }[]>`
    SELECT pg_size_pretty(pg_total_relation_size('"user"')) AS size
  `;

  const inflow = await sql<{ day: string; n: number }[]>`
    SELECT date_trunc('day', u.created_at)::date::text AS day, count(*)::int AS n
    FROM "user" u
    WHERE u.email_verified = false
      AND NOT EXISTS (SELECT 1 FROM account a WHERE a.user_id = u.id)
      AND u.created_at >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 30
  `;

  console.log("\n=== Silent users baseline ===");
  console.log(`total user rows         : ${total}`);
  console.log(`silent users (no acct)  : ${silent}`);
  console.log(`silent + > 90j + idle   : ${silentOld}`);
  console.log(`table size              : ${size}`);
  console.log(`\ninflow silent / jour (30d) :`);
  if (inflow.length === 0) {
    console.log("  (aucun nouveau silent user sur 30j)");
  } else {
    for (const row of inflow) {
      console.log(`  ${row.day}  ${row.n}`);
    }
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
