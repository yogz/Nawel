import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DebtRow } from "./debt-row";

const PAY_URL = "https://revolut.me/yogzgo?amount=1250&currency=EUR&note=Sortie+%3A+Concert";

vi.mock("@/features/sortie/actions/debt-actions", () => ({
  confirmDebtPaidAction: vi.fn(async () => ({})),
  markDebtPaidAction: vi.fn(async () => ({})),
  remindDebtAction: vi.fn(async () => ({})),
  revealIbanAction: vi.fn(async () => ({ ok: true, value: "@yogzgo", payUrl: PAY_URL })),
}));

const props = {
  shortId: "abcdefgh",
  debtId: "00000000-0000-4000-8000-000000000001",
  amountCents: 1250,
  other: { id: "p1", userId: "u1", userName: "Nicolas", anonName: null },
  view: "debtor" as const,
  methods: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "revolut" as const,
      valuePreview: "@yogzgo",
      displayLabel: null,
    },
  ],
};

async function revealPayLink() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Payer/ }));
  });
}

describe("DebtRow — paiement Revolut", () => {
  afterEach(cleanup);

  it("ouvre Revolut par un vrai lien, et garde Copier", async () => {
    render(<DebtRow {...props} status="pending" />);
    await revealPayLink();
    const link = screen.getByRole("link", { name: /Ouvrir Revolut/ });
    expect(link.getAttribute("href")).toBe(PAY_URL);
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("button", { name: "Copier" })).toBeTruthy();
  });

  // Relecture : après « J'ai payé », le lien restait affiché jusqu'à 30 s.
  it("retire le lien dès que le paiement est déclaré", async () => {
    const { rerender } = render(<DebtRow {...props} status="pending" />);
    await revealPayLink();
    rerender(<DebtRow {...props} status="declared_paid" />);
    expect(screen.queryByRole("link", { name: /Ouvrir Revolut/ })).toBeNull();
    expect(screen.queryByText(/reviens toucher/)).toBeNull();
  });
});
