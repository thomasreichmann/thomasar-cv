import { resolveText, type LocalizedText } from "@thomasar-cv/db/schema";

/**
 * The boundary between the schema's `LocalizedText` and the plain strings the
 * field controls deal in. v1 ships single-language, so every value is a bare
 * string and the locale is nominal (`resolveText` returns the string as-is); the
 * i18n seam stays untouched. Editors store the typed string straight back, never
 * widening a value into the `{ default, i18n }` form.
 */
export const LOCALE = "en";

/** Read a value for display in a field. */
export const readText = (value: LocalizedText): string =>
  resolveText(value, LOCALE);

/** Read an optional value; absent reads as an empty field. */
export const readOptional = (value: LocalizedText | undefined): string =>
  value === undefined ? "" : readText(value);

/** A blank field clears an optional value rather than storing an empty string. */
export const toOptional = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value;
