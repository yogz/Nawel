/**
 * Minimal inline-HTML layout used by every Sortie transactional email.
 * Wraps the per-template `body` in the bordeaux/ivoire container. Inline
 * styles only — Gmail and Outlook both strip <style> in many scenarios.
 *
 * We stay out of React Email territory for now; Phase 5.B will revisit
 * once volume justifies the extra ~60 KB client runtime.
 */
export function renderEmail({ preheader, body }: { preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sortie</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F1E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#231E16;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;max-height:0;mso-hide:all;">${preheader}</span>
    <div style="max-width:540px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7E6133;">Sortie</p>
      ${body}
      <hr style="margin:32px 0;border:0;border-top:1px solid #EDE5D2;" />
      <p style="margin:0;font-size:12px;color:#8E8168;">
        Sortie — organiser des sorties entre amis.<br />
        Tu reçois ce mail parce que tu as partagé ton adresse à l'occasion d'une sortie. Aucun email marketing.
      </p>
    </div>
  </body>
</html>`;
}
