import { createHash } from "node:crypto";

/**
 * Minimal structural shape of the inputs that actually influence "what's
 * missing" for a meal. Deliberately excludes `checked`, `price` and `order`:
 * none of them change the assessment, so they must not trigger a paid AI call.
 */
export interface AssessmentHashItem {
  id: number;
  name: string;
  quantity: string | null;
  personId: number | null;
  serviceId: number;
}

export interface AssessmentHashService {
  id: number;
  title: string | null;
  items: AssessmentHashItem[];
}

export interface AssessmentHashMeal {
  title: string | null;
  adults: number;
  children: number;
  services: AssessmentHashService[];
}

/**
 * Stable sha256 of the assessment-relevant inputs. Sorting by entity id makes
 * the hash insensitive to display reordering, while a move (which changes an
 * item's serviceId / owning service) does change it.
 */
export function computeAssessmentInputHash(meal: AssessmentHashMeal): string {
  const services = [...meal.services]
    .sort((a, b) => a.id - b.id)
    .map((service) => ({
      title: service.title ?? "",
      items: [...service.items]
        .sort((a, b) => a.id - b.id)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity ?? "",
          hasPerson: item.personId != null,
          serviceId: item.serviceId,
        })),
    }));

  const canonical = JSON.stringify({
    title: meal.title ?? "",
    adults: meal.adults,
    children: meal.children,
    services,
  });

  return createHash("sha256").update(canonical).digest("hex");
}
