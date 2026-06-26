import {
  resumeContent,
  resumeTheme,
  type ResumeContent,
  type ResumeTheme,
} from "@thomasar-cv/db/schema";

/**
 * The editable unit the editor holds in memory: a résumé's label, its content
 * document, and its theme (presentation, kept beside content - ADR 0006).
 */
export interface ResumeDraft {
  name: string;
  content: ResumeContent;
  theme: ResumeTheme;
}

export type DraftValidation =
  | { ok: true; value: ResumeDraft }
  | { ok: false; message: string };

/**
 * Gate a draft before it is allowed to save. Two things can be wrong from the
 * editor: a blank label (the row's `name` is `min(1)` server-side) and a content
 * document that does not satisfy `resumeContent`. We re-parse content here rather
 * than trust the in-memory shape, so an invalid edit surfaces to the user as a
 * message instead of being silently dropped or bounced back as an opaque 400.
 *
 * The label is validated but returned verbatim (not trimmed): the field shows
 * exactly what is saved, so a save can't leave the input reading "dirty" against
 * a trimmed copy it never typed.
 */
export function validateDraft(draft: ResumeDraft): DraftValidation {
  if (draft.name.trim().length === 0) {
    return { ok: false, message: "Give your résumé a name before saving." };
  }
  const parsed = resumeContent.safeParse(draft.content);
  if (!parsed.success) {
    return {
      ok: false,
      message: "This résumé has invalid content and can't be saved.",
    };
  }
  // The theme is bounded by construction (the controls only set legal enum
  // values), but it is re-parsed on the same footing as content so a save can
  // never persist a shape the column's validation would later reject.
  const theme = resumeTheme.safeParse(draft.theme);
  if (!theme.success) {
    return {
      ok: false,
      message: "This résumé has an invalid theme and can't be saved.",
    };
  }
  return {
    ok: true,
    value: { name: draft.name, content: parsed.data, theme: theme.data },
  };
}

/**
 * Whether the working draft differs from the last-saved snapshot. Deep, and
 * order-independent on purpose: the section editors (#37) rebuild objects as the
 * user types, so a key that lands in a different order must not read as an unsaved
 * change. That rules out a `JSON.stringify` compare, which is order-sensitive.
 */
export function isDirty(a: ResumeDraft, b: ResumeDraft): boolean {
  return !deepEqual(a, b);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(bObj, key) &&
      deepEqual(aObj[key], bObj[key]),
  );
}
