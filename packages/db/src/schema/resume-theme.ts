import { z } from "zod";

/**
 * The résumé *theme*: how the paper looks, kept deliberately apart from
 * `resume-content.ts`, which is *what the paper says*. Content is the user's
 * career data; the theme is presentation. Mixing them would let a layout tweak
 * masquerade as a content edit (and vice-versa) in history and diffs, so they
 * are separate documents - the theme is stored in its own `theme` column on the
 * `resume` row, not nested inside `content`. See
 * `docs/decisions/0006-resume-theme.md`.
 *
 * The model is bounded on purpose: four named controls, each a closed set of
 * choices, never a freeform number or color. That is the requirements' "small,
 * bounded set of theme controls - not freeform": a user picks a look that still
 * fits one clean A4 page and stays ATS-safe, instead of nudging pixels into a
 * layout that breaks parsing. The schema owns the *vocabulary*; the render
 * package (`packages/render/src/theme.ts`) owns how each choice becomes a
 * concrete point size or color, the same way it already owns layout.
 */

/** Line tightness *within* a run of text (leading). Not the gaps between blocks. */
export const themeDensity = z.enum(["compact", "normal", "relaxed"]);
export type ThemeDensity = z.infer<typeof themeDensity>;

/** Whitespace *between* blocks and sections - the page's vertical rhythm. */
export const themeSpacing = z.enum(["compact", "normal", "relaxed"]);
export type ThemeSpacing = z.infer<typeof themeSpacing>;

/** Overall type size: every font size shifts by one proportional step. */
export const themeScale = z.enum(["small", "normal", "large"]);
export type ThemeScale = z.infer<typeof themeScale>;

/**
 * The single accent token. One name selects one color, applied in one place by
 * the template (the name and section headings) - never a freeform hex and never
 * the page background, so the paper stays light and ATS-readable. `graphite` is
 * the neutral default that reads as the current near-black, ink-only look.
 */
export const themeAccent = z.enum([
  "graphite",
  "rust",
  "navy",
  "forest",
  "plum",
]);
export type ThemeAccent = z.infer<typeof themeAccent>;

/**
 * A whole theme. Every field defaults, so `resumeTheme.parse({})` is the
 * neutral baseline and a partially-specified theme fills the rest in - the same
 * defaulting discipline `resumeContent` uses, so a theme is never half-formed.
 */
export const resumeTheme = z.object({
  density: themeDensity.default("normal"),
  spacing: themeSpacing.default("normal"),
  scale: themeScale.default("normal"),
  accent: themeAccent.default("graphite"),
});
export type ResumeTheme = z.infer<typeof resumeTheme>;

/**
 * The neutral baseline theme. Reproduces the original ink-only A4 look, so a
 * résumé with no theme of its own (every résumé today) renders exactly as
 * before. Parsed from `{}` like `emptyResume`, so it can never drift from the
 * schema's own defaults.
 */
export const defaultResumeTheme: ResumeTheme = resumeTheme.parse({});
