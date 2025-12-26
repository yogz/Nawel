import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { withErrorThrower, createSafeAction } from "./action-utils";
import * as errorsModule from "./errors";

// Mock isDatabaseError
vi.mock("./errors", () => ({
  isDatabaseError: vi.fn(),
}));

describe("action-utils.ts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("withErrorThrower", () => {
    it("returns result on success", async () => {
      const action = vi.fn().mockResolvedValue("success");
      const wrapped = withErrorThrower(action);
      const result = await wrapped();
      expect(result).toBe("success");
    });

    it("passes through standard errors", async () => {
      const error = new Error("Standard error");
      const action = vi.fn().mockRejectedValue(error);
      vi.mocked(errorsModule.isDatabaseError).mockReturnValue(false);

      const wrapped = withErrorThrower(action);
      await expect(wrapped()).rejects.toThrow("Standard error");
    });

    it("transforms database errors to user-friendly message", async () => {
      const dbError = new Error("Connection failed");
      const action = vi.fn().mockRejectedValue(dbError);
      vi.mocked(errorsModule.isDatabaseError).mockReturnValue(true);

      const wrapped = withErrorThrower(action);
      await expect(wrapped()).rejects.toThrow(
        "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants."
      );
    });
  });

  describe("createSafeAction", () => {
    const schema = z.object({
      name: z.string().min(3),
    });

    it("calls action with validated data", async () => {
      const internalAction = vi.fn().mockResolvedValue({ id: 1 });
      const safeAction = createSafeAction(schema, internalAction);

      const result = await safeAction({ name: "Valid Name" });
      expect(result).toEqual({ id: 1 });
      expect(internalAction).toHaveBeenCalledWith({ name: "Valid Name" });
    });

    it("throws on invalid input (Zod error)", async () => {
      const internalAction = vi.fn();
      const safeAction = createSafeAction(schema, internalAction);

      await expect(safeAction({ name: "No" })).rejects.toThrow();
      expect(internalAction).not.toHaveBeenCalled();
    });

    it("handles database errors inside the action", async () => {
      const internalAction = vi.fn().mockRejectedValue(new Error("DB Stuff"));
      vi.mocked(errorsModule.isDatabaseError).mockReturnValue(true);
      const safeAction = createSafeAction(schema, internalAction);

      await expect(safeAction({ name: "Valid" })).rejects.toThrow(
        "Désolé, le service est temporairement indisponible"
      );
    });
  });
});
