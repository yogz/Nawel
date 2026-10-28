// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { OutingShowcaseCard } from "./outing-showcase-card";

const outing = {
  id: "o1",
  title: "Pilote | Sitcom improvisée",
  location: "Le Métropole",
  heroImageUrl: "https://example.com/poster.jpg",
};

afterEach(cleanup);

describe("OutingShowcaseCard", () => {
  it("affiche le titre et la salle, sans lien ni date", () => {
    const { container } = render(<OutingShowcaseCard outing={outing} isPast={false} />);
    expect(screen.getByText("Pilote | Sitcom improvisée")).toBeTruthy();
    expect(screen.getByText(formatVenue("Le Métropole")!)).toBeTruthy();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("p.text-acid-600")).toBeNull();
  });

  it("affiche la date et l'organisateur quand ils sont fournis", () => {
    render(
      <OutingShowcaseCard
        outing={outing}
        isPast={false}
        dateLabel="mer. 25 nov. · 19h00"
        organizerLabel="organisé par @cecile"
      />
    );
    expect(screen.getByText("mer. 25 nov. · 19h00")).toBeTruthy();
    expect(screen.getByText("organisé par @cecile")).toBeTruthy();
  });

  it("utilise le poster de repli sans image", () => {
    const { container } = render(
      <OutingShowcaseCard outing={{ ...outing, heroImageUrl: null }} isPast={false} />
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
