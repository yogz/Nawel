import { createHash } from "node:crypto";

// Bump this when the prompt or output format changes meaningfully, to force
// already-stored assessments to be recomputed on the next visit.
export const ASSESSMENT_VERSION = "v4";

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
          hasPerson: item.personId !== null,
          serviceId: item.serviceId,
        })),
    }));

  const canonical = JSON.stringify({
    title: meal.title ?? "",
    adults: meal.adults,
    children: meal.children,
    services,
  });

  // Version prefix so a meaningful prompt/output change forces a recompute of
  // already-stored assessments. Bump ASSESSMENT_VERSION when that's wanted.
  // sha truncated so "vN:<sha>" stays within the varchar(64) column.
  const digest = createHash("sha256").update(canonical).digest("hex").slice(0, 56);
  return `${ASSESSMENT_VERSION}:${digest}`;
}

/** Whether a stored input hash was produced by the current assessment version. */
export function isAssessmentHashCurrent(hash: string | null): boolean {
  return hash !== null && hash.startsWith(`${ASSESSMENT_VERSION}:`);
}
