import type { ReactElement } from "react";

import type { Block } from "./model";

/**
 * A template is the only thing that varies between résumé looks: it turns the
 * ordered, locale-resolved blocks into a single react-pdf `<Page>`. Reading
 * order, visibility and i18n are already settled by `flattenResume`, so a
 * template chooses typography, spacing and dividers - never what content shows
 * or in what order. That boundary is what lets more templates land later (AC of
 * issue #18) without any risk to the ATS-clean single-column text layer.
 */
export interface ResumeTemplate {
  /** Stable id, e.g. for a future template picker. */
  id: string;
  label: string;
  renderPage(blocks: Block[]): ReactElement;
}
