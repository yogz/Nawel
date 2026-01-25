"use client";

import type { Meal, Service } from "@/lib/types";
import { useItemHandlers } from "@/features/items";
import { useMealHandlers } from "@/features/meals";
import { useServiceHandlers } from "@/features/services";
import { usePersonHandlers } from "@/features/people";
import { useIngredientHandlers } from "@/features/ingredients";
import { useEventHandlers as useEventDeleteHandler } from "@/features/events";
import type { PersonHandlerParams } from "@/features/shared/types";

type UseEventHandlersParams = PersonHandlerParams;

/**
 * Composite hook that combines all event-related handlers.
 *
 * For better code organization and tree-shaking, you can also import
 * individual feature hooks directly:
 *
 * @example
 * import { useItemHandlers } from "@/features/items";
 * import { useMealHandlers } from "@/features/meals";
 * import { useServiceHandlers } from "@/features/services";
 * import { usePersonHandlers } from "@/features/people";
 * import { useIngredientHandlers } from "@/features/ingredients";
 * import { useEventHandlers } from "@/features/events";
 */
export function useEventHandlers(params: UseEventHandlersParams) {
  const itemHandlers = useItemHandlers(params);
  const mealHandlers = useMealHandlers(params);
  const serviceHandlers = useServiceHandlers(params);
  const personHandlers = usePersonHandlers(params);
  const ingredientHandlers = useIngredientHandlers(params);
  const eventHandlers = useEventDeleteHandler(params);

  return {
    // Item handlers
    handleCreateItem: itemHandlers.handleCreateItem,
    handleUpdateItem: itemHandlers.handleUpdateItem,
    handleAssign: itemHandlers.handleAssign,
    handleDelete: itemHandlers.handleDelete,
    handleMoveItem: itemHandlers.handleMoveItem,
    findItem: itemHandlers.findItem,
    handleToggleItemChecked: itemHandlers.handleToggleItemChecked,

    // Meal handlers
    handleCreateMeal: mealHandlers.handleCreateMeal,
    handleCreateMealWithServices: mealHandlers.handleCreateMealWithServices,
    handleUpdateMeal: mealHandlers.handleUpdateMeal,
    handleDeleteMeal: (meal: Meal) => mealHandlers.handleDeleteMeal(meal.id),

    // Service handlers
    handleCreateService: serviceHandlers.handleCreateService,
    handleUpdateService: serviceHandlers.handleUpdateService,
    handleDeleteService: (service: Service) => serviceHandlers.handleDeleteService(service.id),

    // Person handlers
    handleCreatePerson: personHandlers.handleCreatePerson,
    handleUpdatePerson: personHandlers.handleUpdatePerson,
    handleDeletePerson: personHandlers.handleDeletePerson,
    handleClaimPerson: personHandlers.handleClaimPerson,
    handleUnclaimPerson: personHandlers.handleUnclaimPerson,
    handleUpdateStatus: personHandlers.handleUpdateStatus,
    handleUpdateGuestCount: personHandlers.handleUpdateGuestCount,

    // Event handlers
    handleDeleteEvent: eventHandlers.handleDeleteEvent,

    // Ingredient handlers
    handleGenerateIngredients: ingredientHandlers.handleGenerateIngredients,
    handleToggleIngredient: ingredientHandlers.handleToggleIngredient,
    handleDeleteIngredient: ingredientHandlers.handleDeleteIngredient,
    handleCreateIngredient: ingredientHandlers.handleCreateIngredient,
    handleDeleteAllIngredients: ingredientHandlers.handleDeleteAllIngredients,
  };
}
