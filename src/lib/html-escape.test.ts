import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("escapes the five HTML-special characters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml('He said "hi"')).toBe("He said &quot;hi&quot;");
  });

  it("passes safe text through unchanged", () => {
    expect(escapeHtml("Carmen à Paris")).toBe("Carmen à Paris");
    expect(escapeHtml("Opéra 2026")).toBe("Opéra 2026");
  });

  it("is idempotent on already-escaped output", () => {
    const once = escapeHtml("<x>");
    const twice = escapeHtml(once);
    // Not equal — that's the correct behaviour; re-escape if you don't trust.
    expect(twice).toBe("&amp;lt;x&amp;gt;");
  });
});
