// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { InlineItemInput } from "./inline-item-input";

// next-intl: passthrough — on ne teste pas les traductions ici.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// framer-motion: rendu DOM simple, pas d'animation en test.
vi.mock("framer-motion", () => ({
  m: { div: "div" },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("InlineItemInput", () => {
  it("ne déclenche onAdd qu'une seule fois si on (re)soumet pendant l'envoi en cours", async () => {
    // onAdd reste en attente : simule une action serveur lente.
    const d = deferred<boolean>();
    const onAdd = vi.fn(() => d.promise);
    render(<InlineItemInput onAdd={onAdd} placeholder="Ajouter" />);

    const input = screen.getByPlaceholderText("Ajouter");
    fireEvent.change(input, { target: { value: "Tarte" } });

    const button = screen.getByText("Enter").closest("button")!;
    fireEvent.click(button); // 1er envoi -> isSubmitting passe à true
    fireEvent.click(button); // 2e envoi pendant l'attente -> doit être ignoré

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("conserve la saisie quand l'ajout échoue (onAdd renvoie false)", async () => {
    const onAdd = vi.fn(async () => false);
    render(<InlineItemInput onAdd={onAdd} placeholder="Ajouter" />);

    const input = screen.getByPlaceholderText("Ajouter") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Tarte" } });
    fireEvent.click(screen.getByText("Enter").closest("button")!);

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    // La valeur n'est PAS effacée : l'invité ne perd pas sa saisie.
    expect(input.value).toBe("Tarte");
  });

  it("vide la saisie quand l'ajout réussit (onAdd renvoie true)", async () => {
    const onAdd = vi.fn(async () => true);
    render(<InlineItemInput onAdd={onAdd} placeholder="Ajouter" />);

    const input = screen.getByPlaceholderText("Ajouter") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Tarte" } });
    fireEvent.click(screen.getByText("Enter").closest("button")!);

    await waitFor(() => expect(input.value).toBe(""));
  });
});
