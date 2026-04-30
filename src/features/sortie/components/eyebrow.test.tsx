// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("rend les classes de base + tone acid par défaut", () => {
    const { container } = render(<Eyebrow>section</Eyebrow>);
    const p = container.querySelector("p")!;
    expect(p).toBeTruthy();
    expect(p.className).toContain("font-mono");
    expect(p.className).toContain("uppercase");
    expect(p.className).toContain("tracking-[0.22em]");
    expect(p.className).toContain("text-acid-600");
    expect(p.textContent).toBe("section");
  });

  it("applique text-hot-500 pour tone='hot'", () => {
    const { container } = render(<Eyebrow tone="hot">─ urgent ─</Eyebrow>);
    expect(container.querySelector("p")!.className).toContain("text-hot-500");
  });

  it("applique text-ink-400 pour tone='muted'", () => {
    const { container } = render(<Eyebrow tone="muted">passé</Eyebrow>);
    expect(container.querySelector("p")!.className).toContain("text-ink-400");
  });

  it("affiche le dot glow acid quand glow=true", () => {
    const { container } = render(<Eyebrow glow>action</Eyebrow>);
    const dot = container.querySelector("span[aria-hidden]");
    expect(dot).toBeTruthy();
    expect(dot!.className).toContain("bg-acid-600");
    expect(dot!.className).toContain("shadow-[0_0_12px_var(--sortie-acid)]");
    // Le wrapper passe en inline-flex pour aligner dot + texte.
    expect(container.querySelector("p")!.className).toContain("inline-flex");
  });

  it("omet le dot quand glow=false (défaut)", () => {
    const { container } = render(<Eyebrow>section</Eyebrow>);
    expect(container.querySelector("span[aria-hidden]")).toBeNull();
    expect(container.querySelector("p")!.className).not.toContain("inline-flex");
  });

  it("merge le className passé via prop par-dessus les défauts", () => {
    const { container } = render(<Eyebrow className="mb-4 text-ink-700">override</Eyebrow>);
    const p = container.querySelector("p")!;
    expect(p.className).toContain("mb-4");
    // La couleur du tone par défaut (acid-600) est encore là, mais
    // text-ink-700 vient après dans la chaîne donc Tailwind le pioche.
    expect(p.className).toContain("text-ink-700");
  });
});
