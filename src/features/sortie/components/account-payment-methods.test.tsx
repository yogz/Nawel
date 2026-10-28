import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccountPaymentMethods, type AccountMethodView } from "./account-payment-methods";

vi.mock("@/features/sortie/actions/account-payment-actions", () => ({
  addAccountPaymentMethodAction: vi.fn(async () => ({})),
  removeAccountPaymentMethodAction: vi.fn(async () => ({})),
}));

// Node 25 expose un `localStorage` natif inutilisable (sans --localstorage-file),
// qui court-circuite le polyfill de vitest.setup.ts : on pose ici un stockage
// mémoire pour ce fichier.
function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

const IBAN: AccountMethodView = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "iban",
  valuePreview: "FR76 **** 1234",
  displayLabel: "Compte joint",
  pending: false,
};
const LYDIA_PENDING: AccountMethodView = {
  id: "22222222-2222-4222-8222-222222222222",
  type: "lydia",
  valuePreview: "+33 6 ** ** ** 42",
  displayLabel: null,
  pending: true,
};

function renderSection(over: Partial<Parameters<typeof AccountPaymentMethods>[0]> = {}) {
  return render(<AccountPaymentMethods methods={[]} canManage outcome={null} {...over} />);
}

describe("AccountPaymentMethods — « Tes moyens de paiement »", () => {
  beforeEach(() => {
    installMemoryStorage();
  });
  afterEach(cleanup);

  it("état vide : texte d'aide et formulaire déjà ouvert", () => {
    const { container } = renderSection();
    expect(container.querySelector("section#moyens")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tes moyens de paiement" })).toBeTruthy();
    expect(
      screen.getByText(
        "Enregistre-les une fois : ils sont joints automatiquement au mail de chacun quand tu déclares un achat."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Masqués partout. En entier seulement pour qui te doit de l'argent, à sa demande."
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("IBAN")).toBeTruthy();
    expect(screen.getByText("Visible par ceux qui te remboursent.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "+ Ajouter un autre moyen" })).toBeNull();
  });

  it("liste les aperçus et signale un ajout en attente de confirmation", () => {
    renderSection({ methods: [IBAN, LYDIA_PENDING] });
    expect(screen.getByText("FR76 **** 1234")).toBeTruthy();
    expect(screen.getByText("Compte joint")).toBeTruthy();
    expect(screen.getByText("+33 6 ** ** ** 42")).toBeTruthy();
    expect(screen.getAllByText("en attente de confirmation")).toHaveLength(1);
  });

  it("avec des moyens, le formulaire est fermé derrière « + Ajouter un autre moyen »", () => {
    renderSection({ methods: [IBAN] });
    expect(screen.queryByLabelText("IBAN")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un autre moyen" }));
    expect(screen.getByLabelText("IBAN")).toBeTruthy();
  });

  it("retrait en deux temps", () => {
    renderSection({ methods: [IBAN] });
    const remove = screen.getByRole("button", { name: "Retirer l'IBAN FR76 **** 1234" });
    expect(remove.className).toContain("h-11");
    expect(screen.queryByRole("button", { name: "Oui, retirer" })).toBeNull();
    fireEvent.click(remove);
    expect(screen.getByRole("button", { name: "Oui, retirer" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("button", { name: "Oui, retirer" })).toBeNull();
  });

  it("aucun champ pré-rempli depuis le navigateur, et l'ancien cache est purgé", () => {
    window.localStorage.setItem("sortie:lastPM:iban", "FR7630006000011234567890189");
    window.localStorage.setItem("sortie:lastPM:lydia", "+33612345678");
    window.localStorage.setItem("autre:cle", "garde");
    renderSection();
    expect((screen.getByLabelText("IBAN") as HTMLInputElement).value).toBe("");
    expect(window.localStorage.getItem("sortie:lastPM:iban")).toBeNull();
    expect(window.localStorage.getItem("sortie:lastPM:lydia")).toBeNull();
    expect(window.localStorage.getItem("autre:cle")).toBe("garde");
  });

  it("compte à l'e-mail non vérifié : pas de formulaire", () => {
    renderSection({ canManage: false });
    expect(screen.queryByLabelText("IBAN")).toBeNull();
    expect(
      screen.getByText("Confirme d'abord ton adresse e-mail pour enregistrer un moyen de paiement.")
    ).toBeTruthy();
  });

  it("affiche le résultat du lien de confirmation", () => {
    renderSection({ methods: [IBAN], outcome: "confirme" });
    expect(screen.getByRole("status").textContent).toContain("Moyen de paiement confirmé.");
  });
});
