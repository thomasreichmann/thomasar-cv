import type { ReactElement } from "react";

import type { ResumeTheme } from "@thomasar-cv/db/schema";

import type { Block } from "./model";

/**
 * A template is the only thing that varies between résumé looks: it turns the
 * ordered, locale-resolved blocks into a single react-pdf `<Page>`. Reading
 * order, visibility and i18n are already settled by `flattenResume`, so a
 * template chooses typography, spacing and dividers - never what content shows
 * or in what order. That boundary is what lets more templates land later (AC of
 * issue #18) without any risk to the ATS-clean single-column text layer.
 *
 * The `theme` is the bounded set of presentation controls (density, spacing,
 * scale, accent); a template reads it to size and color those same choices, so
 * the preview and the export reflect one theme from one definition. See
 * `docs/decisions/0006-resume-theme.md`.
 */
export interface ResumeTemplate {
  /** Stable id, e.g. for a future template picker. */
  id: string;
  label: string;
  renderPage(blocks: Block[], theme: ResumeTheme): ReactElement;
}
