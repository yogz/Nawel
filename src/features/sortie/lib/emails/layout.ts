/**
 * Minimal inline-HTML layout used by every Sortie transactional email.
 * Wraps the per-template `body` in the Acid Cabinet container. Inline
 * styles only — Gmail and Outlook both strip <style> in many scenarios.
 *
 * Surface stays light (off-white) on purpose: Apple Mail dark mode and
 * Outlook handle dark surfaces unpredictably. The "GenZ" energy comes
 * from the bold-tight type, the hot-pink eyebrow, and the noir CTAs.
 */
export function renderEmail({ preheader, body }: { preheader: string; body: string }): string {
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
      <p style="margin:0 0 24px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#FF3D81;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#FF3D81;vertical-align:middle;margin-right:8px;"></span>Sortie
      </p>
      ${body}
      <hr style="margin:36px 0 18px;border:0;border-top:1px solid rgba(10,10,10,0.08);" />
      <p style="margin:0;font-size:12px;line-height:1.6;color:#7A7368;">
        Sortie — entre amis, ça s&rsquo;organise.<br />
        Tu reçois ce mail parce que tu as RSVP à une sortie. Pas de pub, promis.
      </p>
    </div>
  </body>
</html>`;
}
