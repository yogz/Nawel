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
      accountMethods={null}
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

  it("non éligible à la copie : dit quand ajouter son IBAN (pas de lien)", () => {
    renderForm();
    expect(
      screen.getByText(
        "Après l’enregistrement, ajoute ton IBAN ou ton Lydia : chacun le verra sur sa page de remboursement."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /FR76/ })).toBeNull();
  });
});

describe("PurchaseForm — moyens de paiement du compte", () => {
  afterEach(cleanup);

  const METHODS = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      type: "iban" as const,
      valuePreview: "FR76 **** 1234",
      displayLabel: "Compte joint",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      type: "lydia" as const,
      valuePreview: "+33 6 ** ** ** 42",
      displayLabel: null,
    },
  ];

  it("connecté avec des moyens : une case cochée par moyen, et la phrase", () => {
    renderForm({ accountMethods: METHODS });
    expect(
      screen.getByText("Chacun reçoit sa part par e-mail, avec tes moyens de paiement :")
    ).toBeTruthy();
    const iban = screen.getByRole("checkbox", { name: /FR76 \*\*\*\* 1234/ }) as HTMLInputElement;
    const lydia = screen.getByRole("checkbox", {
      name: /\+33 6 \*\* \*\* \*\* 42/,
    }) as HTMLInputElement;
    expect(iban.checked).toBe(true);
    expect(lydia.checked).toBe(true);
    expect(iban.name).toBe("copyMethodIds");
    expect(iban.value).toBe(METHODS[0].id);
    expect(screen.getByText("Compte joint")).toBeTruthy();
    expect(screen.queryByText(/Après l.enregistrement/)).toBeNull();
  });

  it("connecté sans moyen : lien vers Mon argent dans un nouvel onglet", () => {
    renderForm({ accountMethods: [] });
    expect(screen.getByText(/Ajoute ton IBAN ou ton Lydia une fois dans/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Mon argent/ });
    expect(link.getAttribute("href")).toBe("/moi/argent#moyens");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByRole("checkbox", { name: /FR76/ })).toBeNull();
  });
});
