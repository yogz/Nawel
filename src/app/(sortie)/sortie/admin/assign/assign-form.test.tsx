import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AssignSnapshot } from "@/features/sortie/actions/admin-assign-actions";
import { AssignForm } from "./assign-form";

// Les actions serveur tirent la DB : on ne teste ici que le formulaire.
const snapshotMock = vi.fn<(shortId: string, email: string) => Promise<AssignSnapshot>>();
vi.mock("@/features/sortie/actions/admin-assign-actions", () => ({
  adminAssignUserToOutingAction: vi.fn(async () => ({})),
  getAdminAssignSnapshotAction: (shortId: string, email: string) => snapshotMock(shortId, email),
}));

const DATED = {
  shortId: "DATED001",
  title: "Sortie datée",
  fixedDatetime: new Date("2026-11-25T18:00:00.000Z"),
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  pollSlots: null,
};
const POLL = {
  shortId: "POLL0001",
  title: "Sondage ouvert",
  fixedDatetime: null,
  createdAt: new Date("2026-10-02T10:00:00.000Z"),
  pollSlots: [
    { id: "slot-a", startsAt: new Date("2026-11-04T18:00:00.000Z") },
    { id: "slot-b", startsAt: new Date("2026-11-11T18:00:00.000Z") },
  ],
};
const OUTINGS = { upcoming: [POLL, DATED], past: [] };
const USERS = [{ email: "yves@example.com", name: "Yves" }];

function pick(shortId: string) {
  const [outingSelect, userSelect] = screen.getAllByRole("combobox");
  fireEvent.change(outingSelect!, { target: { value: shortId } });
  fireEvent.change(userSelect!, { target: { value: "yves@example.com" } });
}

function submitButton() {
  return screen.getByRole("button", { name: /assigner|mettre à jour|assignation/ });
}

describe("AssignForm", () => {
  afterEach(() => {
    cleanup();
    snapshotMock.mockReset();
  });

  it("propose les créneaux à cocher pour un sondage ouvert, sans menu réponse", async () => {
    snapshotMock.mockResolvedValue(null);
    const { container } = render(<AssignForm outings={OUTINGS} users={USERS} />);
    pick("POLL0001");

    await screen.findByText("Pas encore inscrit sur cette sortie.");
    const boxes = container.querySelectorAll<HTMLInputElement>('input[name="timeslotId"]');
    expect([...boxes].map((b) => b.value)).toEqual(["slot-a", "slot-b"]);
    expect(container.querySelector('select[name="response"]')).toBeNull();
  });

  it("pré-coche les votes existants et annonce qu'ils seront remplacés", async () => {
    snapshotMock.mockResolvedValue({
      response: "interested",
      extraAdults: 1,
      extraChildren: 0,
      availableTimeslotIds: ["slot-b"],
    });
    const { container } = render(<AssignForm outings={OUTINGS} users={USERS} />);
    pick("POLL0001");

    await screen.findByText(/Déjà inscrit — dispo sur 1 créneau · \+1 adulte/);
    const boxes = container.querySelectorAll<HTMLInputElement>('input[name="timeslotId"]');
    expect([...boxes].map((b) => b.checked)).toEqual([false, true]);
    expect(container.querySelector<HTMLInputElement>('input[name="extraAdults"]')?.value).toBe("1");
  });

  it("pré-remplit la réponse et le +1 existants sur une sortie datée", async () => {
    snapshotMock.mockResolvedValue({
      response: "handle_own",
      extraAdults: 1,
      extraChildren: 0,
      availableTimeslotIds: [],
    });
    const { container } = render(<AssignForm outings={OUTINGS} users={USERS} />);
    pick("DATED001");

    await screen.findByText(/Déjà inscrit : handle_own · \+1 adulte/);
    expect(container.querySelector<HTMLSelectElement>('select[name="response"]')?.value).toBe(
      "handle_own"
    );
    expect(container.querySelector<HTMLInputElement>('input[name="extraAdults"]')?.value).toBe("1");
    expect(submitButton().textContent).toBe("mettre à jour");
  });

  it("bloque l'envoi tant que l'inscription existante n'est pas lue", async () => {
    let resolve: (v: AssignSnapshot) => void = () => {};
    snapshotMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<AssignForm outings={OUTINGS} users={USERS} />);
    pick("DATED001");

    expect(submitButton()).toHaveProperty("disabled", true);
    resolve(null);
    await screen.findByText("Pas encore inscrit sur cette sortie.");
    expect(submitButton()).toHaveProperty("disabled", false);
  });
});
