import { ERROR_CODES } from "./errors";

type Translator = (key: string) => string;

/**
 * Map a server-action error to a translated user-facing message.
 * Unknown errors fall back to the error's own message or a generic default.
 */
export function translateActionError(error: unknown, t: Translator): string {
  if (!(error instanceof Error)) {
    return t("Error.defaultDescription");
  }

  if (error.message === ERROR_CODES.SERVICE_UNAVAILABLE) {
    return t("Error.serviceUnavailable");
  }

  return error.message || t("Error.defaultDescription");
}
