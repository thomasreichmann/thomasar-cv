/**
 * The render side of the theme model: it turns the bounded *choices* the schema
 * validates (`@thomasar-cv/db/schema`'s `resumeTheme`) into the concrete numbers
 * and colors a template draws with. This split mirrors the one between
 * `model.ts` and a template - the document layer decides *what* is allowed, this
 * layer decides *how* it looks - so the schema never carries point sizes and the
 * template never re-derives what "compact" means. See
 * `docs/decisions/0006-resume-theme.md`.
 */
import type { ResumeTheme } from "@thomasar-cv/db/schema";

/**
 * Type size multiplier. Applied to every font size, so the whole page grows or
 * shrinks together rather than one element drifting out of proportion. Steps are
 * gentle (±~8%): enough to fit more or breathe more on one A4 page, not enough
 * to restyle.
 */
const SCALE: Record<ResumeTheme["scale"], number> = {
  small: 0.92,
  normal: 1,
  large: 1.08,
};

/** Leading *within* text. `normal` is the template's original 1.35. */
const LINE_HEIGHT: Record<ResumeTheme["density"], number> = {
  compact: 1.2,
  normal: 1.35,
  relaxed: 1.5,
};

/**
 * Multiplier on the gaps *between* blocks (section, row and bullet margins).
 * `normal` is 1, i.e. the template's original spacing untouched; the other steps
 * tighten or open the page's vertical rhythm without moving the A4 margins.
 */
const SPACING: Record<ResumeTheme["spacing"], number> = {
  compact: 0.7,
  normal: 1,
  relaxed: 1.4,
};

/**
 * The accent palette: one muted, print-safe ink per token, chosen to read on
 * white paper. `graphite` is the original near-black, so the default theme keeps
 * the ink-only look. Colors are plain hex (not the chrome's oklch) because
 * react-pdf parses hex/rgb, not oklch.
 */
export const ACCENT: Record<ResumeTheme["accent"], string> = {
  graphite: "#1a1a1a",
  rust: "#9c3d1a",
  navy: "#1e3a5f",
  forest: "#1f4d3a",
  plum: "#5b2a4d",
};

/** A theme resolved to the raw values a template applies. */
export interface ResolvedTheme {
  /** Multiply every font size by this. */
  scale: number;
  /** `lineHeight` for body text. */
  lineHeight: number;
  /** Multiply every inter-block margin by this. */
  spacing: number;
  /** Hex color for the name and section headings. */
  accent: string;
}

export function resolveTheme(theme: ResumeTheme): ResolvedTheme {
  return {
    scale: SCALE[theme.scale],
    lineHeight: LINE_HEIGHT[theme.density],
    spacing: SPACING[theme.spacing],
    accent: ACCENT[theme.accent],
  };
}
