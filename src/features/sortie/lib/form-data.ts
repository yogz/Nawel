/**
 * Convertit un FormData en objet plain pour parsing Zod côté Server Action.
 * Les valeurs non-string (Files) sont normalisées en string vide — les actions
 * qui ont besoin des Files les lisent séparément via `formData.get(name)`.
 *
 * Les checkboxes HTML postent "on" ou sont absents : si une action veut un
 * boolean dérivé, elle post-processe `obj.flag = formData.has("flag")` après
 * avoir appelé ce helper.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = typeof value === "string" ? value : "";
  }
  return obj;
}
