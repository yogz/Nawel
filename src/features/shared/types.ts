import type { PlanData, Item, Service, Person, Sheet } from "@/lib/types";

export interface BaseHandlerParams {
  plan: PlanData;
  setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
  slug: string;
  writeKey?: string;
  readOnly: boolean;
  setSheet: (sheet: Sheet | null) => void;
  setSuccessMessage: (message: { text: string; type?: "success" | "error" } | null) => void;
  session?: any;
  refetch?: () => Promise<any>;
}

export type ItemHandlerParams = BaseHandlerParams;

export type MealHandlerParams = BaseHandlerParams;

export type ServiceHandlerParams = BaseHandlerParams;

export interface PersonHandlerParams extends BaseHandlerParams {
  setSelectedPerson?: (id: number | null) => void;
}

export type IngredientHandlerParams = BaseHandlerParams;

export type { PlanData, Item, Service, Person, Sheet };
