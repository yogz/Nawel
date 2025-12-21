import { InferSelectModel } from "drizzle-orm";
import { days, items, meals, people } from "@/drizzle/schema";

export type Day = InferSelectModel<typeof days> & {
  meals: Meal[];
};

export type Meal = InferSelectModel<typeof meals> & {
  items: Item[];
};

export type Person = InferSelectModel<typeof people>;

export type Item = InferSelectModel<typeof items> & {
  person?: Person | null;
};

export type PlanData = {
  days: Day[];
  people: Person[];
};
