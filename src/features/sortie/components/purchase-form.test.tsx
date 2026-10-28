import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PurchaseForm, type PurchaseView } from "./purchase-form";

vi.mock("@/features/sortie/actions/purchase-actions", () => ({
  declarePurchaseAction: vi.fn(async () => ({})),
}));

const VIEW: PurchaseView = { totalPlaces: 4, adultCount: 4, childCount: 0, allocations: [] };

function renderForm(over: Partial<Parameters<typeof PurchaseForm>[0]> = {}) {
  return render(
    <PurchaseForm
      shortId="JtLFTqLm"
      normalView={VIEW}
      ghostView={VIEW}
      canGhost={false}
      countedNames={["Toi", "Yves (+1)", "Cécile"]}
      noEmailNames={[]}
      paymentHref={null}
      {...over}
    />
  );
}

describe("PurchaseForm — dernier contrôle avant de valider", () => {
  afterEach(cleanup);

  it("liste les prénoms comptés sous le total", () => {
    renderForm();
    expect(screen.getByText("Toi, Yves (+1), Cécile")).toBeTruthy();
  });

  it("annonce l'e-mail et nomme ceux qui n'en recevront pas", () => {
    renderForm({ noEmailNames: ["Cécile"] });
    expect(screen.getByText("Chacun reçoit sa part par e-mail.")).toBeTruthy();
    expect(screen.getByText(/Pas d.e-mail : Cécile\. Préviens-les toi-même\./)).toBeTruthy();
  });

  it("rappelle d'ajouter un moyen de paiement quand il n'y en a pas", () => {
    renderForm({ paymentHref: "/pilote-JtLFTqLm/paiement" });
    const link = screen.getByRole("link", { name: /Ajoute un RIB ou un Lydia/ });
    expect(link.getAttribute("href")).toBe("/pilote-JtLFTqLm/paiement");
  });
});
