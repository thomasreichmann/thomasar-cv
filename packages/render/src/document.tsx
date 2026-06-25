/**
 * `ResumeDocument` is the render definition's entry point: a `ResumeContent` in,
 * a react-pdf `<Document>` out. It owns nothing visual - it flattens the content
 * to ordered blocks and hands them to a template. The preview (issue #18) and
 * the PDF export (issue #19) both render this same component, so they cannot
 * drift: the preview is literally the export's bytes.
 */
import { Document } from "@react-pdf/renderer";

import {
  defaultResumeTheme,
  type ResumeContent,
  type ResumeTheme,
} from "@thomasar-cv/db/schema";

import { flattenResume } from "./model";
import type { ResumeTemplate } from "./template";
import { atsTemplate } from "./templates/ats";

export interface ResumeDocumentProps {
  content: ResumeContent;
  /** Locale used to resolve translatable values. Defaults to English. */
  locale?: string;
  template?: ResumeTemplate;
  /**
   * Presentation controls (density, spacing, scale, accent). Defaults to the
   * neutral baseline, so content with no theme renders as the original ink-only
   * look. Both surfaces - preview and export - pass through here, so neither can
   * show a theme the other does not.
   */
  theme?: ResumeTheme;
}

export function ResumeDocument({
  content,
  locale = "en",
  template = atsTemplate,
  theme = defaultResumeTheme,
}: ResumeDocumentProps) {
  const blocks = flattenResume(content, locale);
  return <Document>{template.renderPage(blocks, theme)}</Document>;
}
