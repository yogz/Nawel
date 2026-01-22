import { type InferSelectModel } from "drizzle-orm";
import {
  type meals,
  type items,
  type services,
  type people,
  type events,
  type ingredients,
} from "@drizzle/schema";

export type Meal = InferSelectModel<typeof meals> & {
  services: Service[];
};

export type Service = InferSelectModel<typeof services> & {
  items: Item[];
  icon?: string | null;
};

export type Person = InferSelectModel<typeof people> & {
  user?: {
    image?: string | null;
    name?: string | null;
    emoji?: string | null;
  } | null;
  guest_adults: number;
  guest_children: number;
  status?: string | null;
  token?: string | null;
};

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

export type Sheet =
  | { type: "item"; item?: Item; serviceId?: number }
  | { type: "service"; mealId: number }
  | { type: "service-edit"; service: Service }
  | { type: "meal-edit"; meal: Meal }
  | { type: "meal-create" }
  | { type: "person" }
  | { type: "person-edit"; person: Person }
  | { type: "share" }
  | { type: "guest-access" }
  | { type: "claim-person"; unclaimed: Person[] }
  | { type: "shopping-list"; person: Person }
  | { type: "item-ingredients"; itemId: number; itemName: string; ingredients: Ingredient[] }
  | { type: "event-edit" };

// Basic item data for creation/updates
export type ItemData = {
  name: string;
  quantity?: string;
  note?: string;
  price?: number;
  personId?: number | null;
  serviceId?: number; // Optional for updates, required for creation implies different types but we can keep it loose or split
};

export interface OrganizerHandlers {
  findItem: (id: number) => { item: Item; service: Service; mealId?: number } | null | undefined;
  handleCreateItem: (data: ItemData, closeSheet?: boolean) => void;
  handleUpdateItem: (id: number, data: ItemData) => void;
  handleAssign: (item: Item, personId: number | null) => void;
  handleDelete: (item: Item, closeSheet?: boolean) => void;
  handleMoveItem: (itemId: number, serviceId: number, index?: number) => void;
  handleCreateMeal: (
    date: string,
    title?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => Promise<number>;
  handleCreateService: (
    mealId: number,
    title: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  handleUpdateMeal: (
    id: number,
    date: string,
    title?: string,
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
  handleDeleteMeal: (meal: Meal) => void;
  handleUpdateService: (
    id: number,
    title: string,
    adults?: number,
    children?: number,
    peopleCount?: number
  ) => void;
  handleDeleteService: (service: Service) => void;
  handleCreatePerson: (name: string, emoji?: string, userId?: string) => void;
  handleClaimPerson: (personId: number) => void;
  handleUnclaimPerson: (personId: number) => void;
  handleCreateMealWithServices: (
    date: string,
    title?: string,
    services?: string[],
    adults?: number,
    children?: number,
    time?: string,
    address?: string
  ) => void;
  handleUpdatePerson: (
    id: number,
    name: string,
    emoji?: string | null,
    image?: string | null
  ) => void;
  handleDeletePerson: (id: number) => void;
  handleGenerateIngredients: (
    itemId: number,
    name: string,
    adults?: number,
    children?: number,
    peopleCount?: number,
    locale?: string,
    note?: string
  ) => Promise<void>;
  handleToggleIngredient: (id: number, itemId: number, checked: boolean) => void;
  handleDeleteIngredient: (id: number, itemId: number) => void;
  handleCreateIngredient: (itemId: number, name: string, quantity?: string) => void;
  handleDeleteAllIngredients: (itemId: number) => void;
  handleToggleItemChecked: (itemId: number, checked: boolean) => void;
  handleSaveFeedback?: (itemId: number, rating: number) => Promise<void>;
  justGenerated?: number | null;
}
