import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WhoIsComingForm, type WhoIsComingRegular } from "./who-is-coming-form";

vi.mock("@/features/sortie/actions/who-is-coming-actions", () => ({
  saveWhoIsComingAction: vi.fn(async () => ({})),
}));

const YVES: WhoIsComingRegular = {
  key: "k-yves",
  name: "Yves",
  hasEmail: true,
  outingsTogether: 11,
  lastOutingTitle: "LOREEN",
  lastOutingAt: null,
  selected: false,
  extraAdults: 0,
  extraChildren: 0,
};
const CECILE: WhoIsComingRegular = {
  ...YVES,
  key: "k-cecile",
  name: "Cécile",
  hasEmail: false,
  outingsTogether: 1,
};

function renderForm(regulars: WhoIsComingRegular[]) {
  return render(
    <WhoIsComingForm
      shortId="JtLFTqLm"
      regulars={regulars}
      self={{ extraAdults: 0, extraChildren: 0 }}
    />
  );
}

describe("WhoIsComingForm", () => {
  afterEach(cleanup);

  it("ouvre directement l'ajout quand il n'y a pas encore d'habitués", () => {
    renderForm([]);
    expect(
      screen.getByText(/Pas encore d.habitués\. Ceux qui viennent à tes sorties apparaîtront ici\./)
    ).toBeTruthy();
    expect(screen.getByLabelText("Prénom")).toBeTruthy();
  });

  it("compte les places en cochant un habitué", () => {
    renderForm([YVES, CECILE]);
    expect(screen.getByRole("button", { name: /Continuer · 1 place/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Yves/ }));
    expect(screen.getByRole("button", { name: /Continuer · 2 places/ })).toBeTruthy();
  });

  it("signale les habitués sans e-mail et les sorties partagées", () => {
    renderForm([YVES, CECILE]);
    expect(screen.getByText(/11 sorties ensemble/)).toBeTruthy();
    expect(screen.getByText(/^pas d.e-mail$/)).toBeTruthy();
  });

  it("ajoute une nouvelle personne cochée sous « Toi »", () => {
    renderForm([YVES]);
    fireEvent.click(screen.getByRole("button", { name: /\+ Ajouter quelqu.un/ }));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Léa" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(screen.getByRole("checkbox", { name: /Léa/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: /Continuer · 2 places/ })).toBeTruthy();
  });
});
