import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssignForm } from "./assign-form";

// L'action serveur tire la DB : on ne teste ici que le rendu du formulaire.
vi.mock("@/features/sortie/actions/admin-assign-actions", () => ({
  adminAssignUserToOutingAction: vi.fn(async () => ({})),
}));

const OUTINGS = [
  {
    shortId: "DATED001",
    title: "Sortie datée",
    fixedDatetime: new Date("2026-11-25T18:00:00.000Z"),
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    pollSlots: null,
  },
  {
    shortId: "POLL0001",
    title: "Sondage ouvert",
    fixedDatetime: null,
    createdAt: new Date("2026-10-02T10:00:00.000Z"),
    pollSlots: [
      { id: "slot-a", startsAt: new Date("2026-11-04T18:00:00.000Z") },
      { id: "slot-b", startsAt: new Date("2026-11-11T18:00:00.000Z") },
    ],
  },
];
const USERS = [{ email: "yves@example.com", name: "Yves" }];

function selectOuting(shortId: string) {
  fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: shortId } });
}

describe("AssignForm", () => {
  afterEach(cleanup);

  it("propose les créneaux à cocher pour un sondage ouvert, sans menu réponse", () => {
    const { container } = render(<AssignForm outings={OUTINGS} users={USERS} />);
    selectOuting("POLL0001");

    const boxes = container.querySelectorAll<HTMLInputElement>('input[name="timeslotId"]');
    expect([...boxes].map((b) => b.value)).toEqual(["slot-a", "slot-b"]);
    expect(container.querySelector('select[name="response"]')).toBeNull();
  });

  it("garde le menu réponse pour une sortie datée", () => {
    const { container } = render(<AssignForm outings={OUTINGS} users={USERS} />);
    selectOuting("DATED001");

    expect(container.querySelector('select[name="response"]')).not.toBeNull();
    expect(container.querySelectorAll('input[name="timeslotId"]')).toHaveLength(0);
  });
});
