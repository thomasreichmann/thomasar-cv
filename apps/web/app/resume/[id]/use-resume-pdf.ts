import { useEffect, useMemo, useState } from "react";

import { resumeContent, type ResumeContent } from "@thomasar-cv/db/schema";

import { useDebouncedValue } from "@/lib/use-debounced-value";

/** How long edits settle before a re-render fires, so typing stays responsive. */
const DEBOUNCE_MS = 450;

export type PreviewStatus = "rendering" | "ready" | "error";

export interface ResumePdf {
  /** Bytes of the latest successful render; null until the first one lands. */
  data: Uint8Array | null;
  status: PreviewStatus;
}

/** The last settled render: which request body produced it, and whether it succeeded. */
interface Outcome {
  /** The debounced body this outcome is for; `undefined` before any fetch settles. */
  body: string | undefined;
  data: Uint8Array | null;
  ok: boolean;
}

/**
 * Renders the editor's in-memory content to PDF bytes through the shared engine
 * (issue #39), debounced so a burst of keystrokes makes one server render, not
 * one per character. The content is serialized once and the *string* is debounced
 * - so an edit that produces identical JSON (a no-op round-trip through an editor)
 * doesn't trigger a render - then POSTed to `/api/preview`, which reuses
 * `renderResumeToBuffer`. There is no second client render path (ADR 0002).
 *
 * Status is derived, not set inside the effect: a render is in flight whenever the
 * debounced body is ahead of the last settled `outcome`. Each new render aborts
 * the one in flight, so out-of-order responses can't paint a stale frame, and the
 * displayed bytes only move forward on success - an invalid intermediate edit or a
 * failed render keeps the last good preview on screen rather than blanking it.
 */
export function useResumePdf(content: ResumeContent): ResumePdf {
  // Validate before serializing: a mid-edit document is almost always valid (every
  // field is optional or defaulted), but skipping the round-trip when it isn't
  // avoids a guaranteed 400 and keeps the last good frame up.
  const body = useMemo(() => {
    const parsed = resumeContent.safeParse(content);
    return parsed.success ? JSON.stringify(parsed.data) : null;
  }, [content]);

  const debounced = useDebouncedValue(body, DEBOUNCE_MS);

  const [outcome, setOutcome] = useState<Outcome>({
    body: undefined,
    data: null,
    ok: true,
  });

  useEffect(() => {
    if (debounced === null) return;
    const controller = new AbortController();
    let active = true;

    void fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: debounced,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Preview render failed: ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (active) setOutcome({ body: debounced, data: bytes, ok: true });
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        // Surfaced through the "error" status (and the indicator), not the
        // console: a fetch cut off by navigating away rejects the same way a real
        // failure does, so logging it would just be navigation noise. Keep the
        // last good bytes; only the status flips to error.
        setOutcome((prev) => ({ ...prev, body: debounced, ok: false }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debounced]);

  const pending = debounced !== null && outcome.body !== debounced;
  const status: PreviewStatus = pending
    ? "rendering"
    : outcome.ok
      ? "ready"
      : "error";

  return { data: outcome.data, status };
}
