"use client";

import { Loader2Icon } from "lucide-react";

import { PdfCanvas } from "@/components/pdf-canvas";

import { useEditor } from "./editor-context";
import { Eyebrow } from "./editors/editor-fields";
import { useResumePdf, type PreviewStatus } from "./use-resume-pdf";

/**
 * The editor's live preview (#39): the in-memory document rendered through the
 * shared engine and painted by the same pdf.js canvas the standalone preview
 * uses, so it is the exported PDF rasterized rather than a second layout (ADR
 * 0002). It stays light - a résumé is a printed, ATS-parsed document, not chrome
 * (ADR 0003) - so the paper never takes the dark chrome tokens. Sticky beside a
 * long document, with the A4 slot reserved so the column doesn't jump as renders
 * land.
 */
export function LivePreview() {
  const { content, theme } = useEditor();
  const { data, status } = useResumePdf(content, theme);

  return (
    <aside className="duration-700 animate-in fade-in-0 xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Preview</Eyebrow>
        <PreviewIndicator status={status} />
      </div>
      <div className="mt-3 aspect-[210/297] w-full overflow-hidden rounded-sm bg-white shadow-2xl shadow-black/60 ring-1 ring-black/10">
        {data === null && status === "error" ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-400">
            Couldn&apos;t render the preview.
          </div>
        ) : (
          <PdfCanvas data={data} loadingLabel="Rendering preview…" />
        )}
      </div>
    </aside>
  );
}

/**
 * The at-a-glance render state, beside the eyebrow. It only speaks when there is
 * something to say: a quiet "Updating" while a render is in flight (the previous
 * frame stays on screen meanwhile), an error note when one fails, nothing once
 * the preview is current.
 */
function PreviewIndicator({ status }: { status: PreviewStatus }) {
  if (status === "ready") return null;
  if (status === "error") {
    return (
      <span className="text-[0.7rem] text-destructive" role="status">
        Preview failed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground"
      role="status"
    >
      <Loader2Icon className="size-3 animate-spin" />
      Updating
    </span>
  );
}
