import { format, isValid } from "date-fns";

/**
 * Deterministic datetime for SSR + client (avoids Intl ICU space mismatches).
 * Pattern matches the previous es-CL medium/short look without locale AM/PM quirks.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) {
    return "—";
  }

  return format(date, "dd-MM-yyyy, HH:mm");
}
