import { describe, expect, it } from "vitest";
import { extractPage } from "./extract-page";

const html = `<html><head>
<meta property="og:title" content="Concert">
<meta property="og:site_name" content="Salle Pleyel">
<script type="application/ld+json">
{"@type":"Event","name":"Concert","location":{"name":"Grande Salle"},"startDate":"2026-06-18"}
</script>
</head><body></body></html>`;

describe("extractPage", () => {
  it("expose le nom du site, la salle JSON-LD et la date brute", () => {
    const page = extractPage(html);
    expect(page.siteName).toBe("Salle Pleyel");
    expect(page.jsonLdVenue).toBe("Grande Salle");
    expect(page.startsAt).toBe("2026-06-18");
  });

  it("liste toutes les représentations et le texte visible", () => {
    const multi = `<html><head>
<script type="application/ld+json">
[{"@type":"Event","name":"Werther","startDate":"2027-02-14T14:30"},
 {"@type":"Event","name":"Werther","startDate":"2027-02-16T19:30"}]
</script><style>.x{}</style></head>
<body><h1>Werther</h1><p>Le 14 février&nbsp;à 14h30</p><script>var a=1;</script></body></html>`;
    const page = extractPage(multi);
    expect(page.jsonLdStartDates).toEqual(["2027-02-14T14:30", "2027-02-16T19:30"]);
    expect(page.text).toBe("Werther Le 14 février à 14h30");
  });
});
