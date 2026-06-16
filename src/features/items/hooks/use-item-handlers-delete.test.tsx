// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useItemHandlers } from "./use-item-handlers";
import type { ItemHandlerParams } from "@/features/shared/types";
import type { PlanData } from "@/lib/types";

const deleteItemAction = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/app/actions", () => ({
  createItemAction: vi.fn(),
  updateItemAction: vi.fn(),
  deleteItemAction: (...a: unknown[]) => deleteItemAction(...a),
  assignItemAction: vi.fn(),
  moveItemAction: vi.fn(),
  toggleItemCheckedAction: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));
vi.mock("@/lib/confetti", () => ({ fireEmojiConfetti: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackItemAction: vi.fn(), trackDragDrop: vi.fn() }));

const ITEM = { id: 1, serviceId: 10, name: "Tarte", personId: null, person: null } as unknown;
const PLAN = {
  event: { id: 1, slug: "bbq", adminKey: "k" },
  people: [],
  meals: [{ id: 100, services: [{ id: 10, items: [ITEM] }] }],
} as unknown as PlanData;

function makeParams(overrides: Partial<ItemHandlerParams> = {}): ItemHandlerParams {
  return {
    plan: PLAN,
    setPlan: vi.fn(),
    slug: "bbq",
    writeKey: "k",
    readOnly: false,
    setSheet: vi.fn(),
    token: "t",
    ...overrides,
  };
}

// Récupère les options passées au dernier toast.success (action / onAutoClose…).
function lastToastOptions() {
  const call = toastSuccess.mock.calls.at(-1)!;
  return call[1] as {
    action: { onClick: () => void };
    onAutoClose: () => void;
    onDismiss: () => void;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteItemAction.mockResolvedValue(undefined);
});

describe("handleDelete (undo)", () => {
  it("ne supprime pas côté serveur immédiatement (suppression différée)", () => {
    const { result } = renderHook(() => useItemHandlers(makeParams()));
    act(() => result.current.handleDelete(ITEM as never));
    expect(deleteItemAction).not.toHaveBeenCalled();
  });

  it("supprime côté serveur quand le toast se ferme (onAutoClose)", async () => {
    const { result } = renderHook(() => useItemHandlers(makeParams()));
    act(() => result.current.handleDelete(ITEM as never));

    await act(async () => {
      lastToastOptions().onAutoClose();
    });
    await waitFor(() => expect(deleteItemAction).toHaveBeenCalledTimes(1));
  });

  it("Annuler restaure le plan et ne supprime jamais côté serveur", async () => {
    const setPlan = vi.fn();
    const { result } = renderHook(() => useItemHandlers(makeParams({ setPlan })));
    act(() => result.current.handleDelete(ITEM as never));

    act(() => lastToastOptions().action.onClick()); // l'utilisateur clique « Annuler »
    act(() => lastToastOptions().onDismiss()); // le clic ferme aussi le toast

    expect(setPlan).toHaveBeenCalledWith(PLAN); // plan restauré
    expect(deleteItemAction).not.toHaveBeenCalled();
  });
});
