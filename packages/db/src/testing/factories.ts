import { exampleResume } from "../fixtures/example-resume";
import type { ResumeContent } from "../schema/resume-content";

/**
 * Factory layer (layer 1 of the e2e setup: factories -> fixtures -> scenarios,
 * see apps/web/e2e/README.md). Builds a valid résumé content document from
 * overrides so a test asks for "a résumé named X" instead of hand-authoring the
 * whole document, and so unit and e2e share one builder instead of two.
 *
 * Starts from a deep clone of the example résumé so callers never mutate the
 * shared fixture. Intentionally small: today only the header name needs to vary
 * per test, so that is the only knob; widen the overrides as content-editing
 * tests need more.
 */
export function makeResumeContent(
  overrides: { headerName?: string } = {},
): ResumeContent {
  const content = structuredClone(exampleResume);
  if (overrides.headerName !== undefined) {
    content.header.name = overrides.headerName;
  }
  return content;
}
