import type { PlanData, Item, Service, Person, Sheet } from "@/lib/types";

/** Extended user type with custom emoji field */
export interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emoji?: string | null;
}

/** Session type with extended user */
export interface ExtendedSession {
  user: ExtendedUser;
}

export interface BaseHandlerParams {
  plan: PlanData;
  setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
  slug: string;
  writeKey?: string;
  readOnly: boolean;
  setSheet: (sheet: Sheet | null) => void;
  setSuccessMessage: (message: { text: string; type?: "success" | "error" } | null) => void;
  session?: ExtendedSession | null;
  refetch?: () => Promise<unknown>;
  token?: string | null;
}

export type ItemHandlerParams = BaseHandlerParams;

export type MealHandlerParams = BaseHandlerParams;

export type ServiceHandlerParams = BaseHandlerParams;

export interface PersonHandlerParams extends BaseHandlerParams {
  setSelectedPerson?: (id: number | null) => void;
}

export type IngredientHandlerParams = BaseHandlerParams;

export type { PlanData, Item, Service, Person, Sheet };
