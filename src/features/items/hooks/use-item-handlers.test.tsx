// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useItemHandlers } from "./use-item-handlers";
import type { ItemHandlerParams } from "@/features/shared/types";
import type { PlanData } from "@/lib/types";

const createItemAction = vi.fn();
const updateItemAction = vi.fn();
const deleteItemAction = vi.fn();
const assignItemAction = vi.fn();
const moveItemAction = vi.fn();
const toggleItemCheckedAction = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/app/actions", () => ({
  createItemAction: (...a: unknown[]) => createItemAction(...a),
  updateItemAction: (...a: unknown[]) => updateItemAction(...a),
  deleteItemAction: (...a: unknown[]) => deleteItemAction(...a),
  assignItemAction: (...a: unknown[]) => assignItemAction(...a),
  moveItemAction: (...a: unknown[]) => moveItemAction(...a),
  toggleItemCheckedAction: (...a: unknown[]) => toggleItemCheckedAction(...a),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));
vi.mock("@/lib/confetti", () => ({ fireEmojiConfetti: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackItemAction: vi.fn(), trackDragDrop: vi.fn() }));

const ITEM = { id: 1, serviceId: 10, name: "Tarte", personId: null, person: null } as unknown;
const PLAN = {
  event: { id: 1, slug: "bbq", adminKey: "k" },
  people: [{ id: 5, name: "Bob" }],
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useItemHandlers", () => {
  it("rollback + toast d'erreur quand l'assignation échoue (pas de faux succès)", async () => {
    assignItemAction.mockRejectedValueOnce(new Error("boom"));
    const setPlan = vi.fn();
    const { result } = renderHook(() => useItemHandlers(makeParams({ setPlan })));

    act(() => {
      result.current.handleAssign(ITEM as never, 5);
    });

    // L'échec restaure le plan précédent et signale l'erreur ; aucun toast de succès.
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("person.errorClaim"));
    expect(setPlan).toHaveBeenCalledWith(PLAN);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("handleCreateItem renvoie false quand l'action échoue", async () => {
    createItemAction.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useItemHandlers(makeParams()));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.handleCreateItem(
        { name: "X", serviceId: 10 } as never,
        false
      );
    });

    expect(returned).toBe(false);
    expect(toastError).toHaveBeenCalledWith("item.errorAdd");
  });

  it("handleCreateItem renvoie true quand l'action réussit", async () => {
    createItemAction.mockResolvedValueOnce({ id: 2, serviceId: 10, name: "X", personId: null });
    const { result } = renderHook(() => useItemHandlers(makeParams()));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.handleCreateItem(
        { name: "X", serviceId: 10 } as never,
        false
      );
    });

    expect(returned).toBe(true);
    expect(toastSuccess).toHaveBeenCalled();
  });
});
