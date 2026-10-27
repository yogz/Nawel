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
});
