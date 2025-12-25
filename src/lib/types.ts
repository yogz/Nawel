import { InferSelectModel } from "drizzle-orm";
import { meals, items, services, people, events, ingredients } from "@drizzle/schema";

export type Meal = InferSelectModel<typeof meals> & {
  services: Service[];
};

export type Service = InferSelectModel<typeof services> & {
  items: Item[];
};

export type Person = InferSelectModel<typeof people>;

export type Ingredient = InferSelectModel<typeof ingredients>;

export type Item = InferSelectModel<typeof items> & {
  person?: Person | null;
  ingredients?: Ingredient[];
};

export type Event = InferSelectModel<typeof events>;

export type PlanData = {
  event: Event | null;
  meals: Meal[];
  people: Person[];
};

export type PlanningFilter =
  | { type: "all" }
  | { type: "unassigned" }
  | { type: "person"; personId: number };
