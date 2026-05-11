/**
 * Minimal inline-HTML layout used by every Sortie transactional email.
 * Wraps the per-template `body` in the Acid Cabinet container. Inline
 * styles only — Gmail and Outlook both strip <style> in many scenarios.
 *
 * Surface stays light (off-white) on purpose: Apple Mail dark mode and
 * Outlook handle dark surfaces unpredictably. The "GenZ" energy comes
 * from the bold-tight type, the noir CTAs, and the brand header.
 *
 * Header = table 2-cols (img wax-seal + wordmark) plutôt que div/flex,
 * parce qu'Outlook Windows ignore flex et casse en vertical sur Gmail
 * Android quand l'image est bloquée. Le wordmark texte porte la marque
 * en fallback image-blocking (Gmail proxy ~30% des destinataires).
 *
 * Asset wax-seal : URL absolue obligatoire (les clients email ne suivent
 * pas les chemins relatifs). Configurable via `NEXT_PUBLIC_SORTIE_URL`
 * pour les previews/staging ; default prod sortie.colist.fr.
 */

const SORTIE_ORIGIN = (process.env.NEXT_PUBLIC_SORTIE_URL ?? "https://sortie.colist.fr").replace(
  /\/$/,
  ""
);
const WAX_SEAL_URL = `${SORTIE_ORIGIN}/sortie/email-assets/wax-seal`;

const DEFAULT_REASON = "Pas de pub, promis.";

export function renderEmail({
  preheader,
  body,
  reason = DEFAULT_REASON,
}: {
  preheader: string;
  body: string;
  /**
   * Une phrase sous la signature dans le footer ("Tu reçois ce mail
   * parce que…"). Default neutre — les callers transactionnels avec un
   * contexte clair (RSVP, billet uploadé, broadcast) doivent le passer
   * pour expliciter pourquoi l'utilisateur reçoit le mail.
   */
  reason?: string;
}): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>Sortie</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F2EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#0A0A0A;-webkit-font-smoothing:antialiased;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;max-height:0;mso-hide:all;">${preheader}</span>
    <div style="max-width:540px;margin:0 auto;padding:36px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 28px;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;line-height:0;">
            <img src="${WAX_SEAL_URL}" alt="Sortie" width="48" height="48" style="display:block;border:0;outline:none;text-decoration:none;width:48px;height:48px;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:'Inter Tight','Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-size:22px;line-height:1;font-weight:900;letter-spacing:-0.03em;color:#0A0A0A;">sortie<span style="color:#C7FF3C;">.</span></span>
          </td>
        </tr>
      </table>
      ${body}
      <hr style="margin:36px 0 18px;border:0;border-top:1px solid rgba(10,10,10,0.08);" />
      <p style="margin:0;font-size:12px;line-height:1.6;color:#7A7368;">
        Sortie — entre amis, ça s&rsquo;organise.<br />
        ${reason}
      </p>
    </div>
  </body>
</html>`;
}
