import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaymentMethodsManager } from "./payment-methods-manager";

vi.mock("@/features/sortie/actions/payment-method-actions", () => ({
  addPaymentMethodAction: vi.fn(async () => ({})),
  removePaymentMethodAction: vi.fn(async () => ({})),
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

describe("PaymentMethodsManager — fin du cache navigateur en clair", () => {
  beforeEach(() => {
    installMemoryStorage();
  });
  afterEach(cleanup);

  it("ne pré-remplit plus l'IBAN depuis localStorage et purge l'ancien cache", () => {
    window.localStorage.setItem("sortie:lastPM:iban", "FR7630006000011234567890189");
    window.localStorage.setItem("sortie:lastPM:wero", "+33612345678");
    render(<PaymentMethodsManager shortId="JtLFTqLm" methods={[]} />);
    expect((screen.getByLabelText("IBAN") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("─ pré-rempli")).toBeNull();
    expect(window.localStorage.getItem("sortie:lastPM:iban")).toBeNull();
    expect(window.localStorage.getItem("sortie:lastPM:wero")).toBeNull();
  });
});
