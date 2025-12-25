import { relations } from "drizzle-orm/relations";
import { days, meals, items, people, events, ingredients } from "./schema";

export const mealsRelations = relations(meals, ({one, many}) => ({
	day: one(days, {
		fields: [meals.dayId],
		references: [days.id]
	}),
	items: many(items),
}));

export const daysRelations = relations(days, ({one, many}) => ({
	meals: many(meals),
	event: one(events, {
		fields: [days.eventId],
		references: [events.id]
	}),
}));

export const itemsRelations = relations(items, ({one, many}) => ({
	meal: one(meals, {
		fields: [items.mealId],
		references: [meals.id]
	}),
	person: one(people, {
		fields: [items.personId],
		references: [people.id]
	}),
	ingredients: many(ingredients),
}));

export const peopleRelations = relations(people, ({one, many}) => ({
	items: many(items),
	event: one(events, {
		fields: [people.eventId],
		references: [events.id]
	}),
}));

export const eventsRelations = relations(events, ({many}) => ({
	days: many(days),
	people: many(people),
}));

export const ingredientsRelations = relations(ingredients, ({one}) => ({
	item: one(items, {
		fields: [ingredients.itemId],
		references: [items.id]
	}),
}));