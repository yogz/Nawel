import * as dotenv from "dotenv";
dotenv.config();
import { sendSortieEmail } from "../../src/lib/resend-sortie";
import { renderEmail } from "../../src/features/sortie/lib/emails/layout";

// Test manuel du wrapper renderEmail() après changement de header.
// Usage: npx tsx scripts/admin/send-test-email.ts <email>

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/admin/send-test-email.ts <email>");
    process.exit(1);
  }

  const body = `
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:#FF3D81;">
      ─ test header ─
    </p>
    <h1 style="margin:0 0 14px;font-size:30px;line-height:1.1;letter-spacing:-0.03em;font-weight:800;color:#0A0A0A;">
      Aperçu du nouveau header.
    </h1>
    <p style="margin:0 0 18px;color:#3A3833;line-height:1.6;font-size:15px;">
      Si tu vois le wax seal noir et le wordmark <span style="font-weight:700;">sortie<span style="color:#C7FF3C;">.</span></span> en haut, c'est gagné. Le footer en bas devrait afficher "Pas de pub, promis." au lieu de la mention RSVP hardcodée.
    </p>
    <p style="margin:28px 0;">
      <a href="https://sortie.colist.fr" style="display:inline-block;padding:14px 26px;background:#0A0A0A;color:#C7FF3C;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.01em;">Ouvrir Sortie</a>
    </p>
    <p style="margin:0;font-size:13px;color:#7A7368;line-height:1.6;">
      ↳ Mail de test envoyé manuellement depuis scripts/admin/send-test-email.ts
    </p>
  `;

  await sendSortieEmail({
    to,
    subject: "Test — nouveau header Sortie",
    html: renderEmail({
      preheader: "Test visuel du wrapper renderEmail() — header + footer",
      body,
      reason: "Mail de test manuel. Tu peux l'ignorer.",
    }),
  });

  console.log(`OK. Envoyé à ${to}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
