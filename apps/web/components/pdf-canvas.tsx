"use client";

import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";

/**
 * Paints page 1 of a PDF onto a canvas with pdf.js, sized to fill its parent.
 * This is the single on-screen render path: the static preview (#18) and the
 * editor's live preview (#39) both feed it bytes, so the picture is always the
 * exported PDF rasterized - never a second HTML layout of the résumé (ADR 0002).
 * The same library extracts the ATS text layer (#20), so what shows here is what
 * the parser reads.
 *
 * It fills the parent rather than sizing itself, so the caller owns the A4 paper
 * box (and reserves its space) while this owns only the pixels. pdf.js is loaded
 * lazily in the effect (browser only) so it never runs during SSR.
 *
 * Re-rendering keeps the previous frame on screen until the next paints: the
 * canvas bitmap is only reset when its pixel dimensions actually change, so a
 * debounced live re-render of the same A4 page repaints in place with no blank
 * flash between keystrokes.
 */
export function PdfCanvas({
  data,
  label = "preview",
  loadingLabel,
}: {
  /** PDF bytes to paint; `null` holds the loading state (no document yet). */
  data: Uint8Array | null;
  /** Used in the failure copy, e.g. "Could not render the {label}.". */
  label?: string;
  /** Copy shown before the first frame paints; omitted leaves the box blank. */
  loadingLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<Status>("loading");

  // Track the container's CSS width so the page rasterizes at display size: the
  // editor column and the standalone page hand this very different widths, and a
  // re-measure on resize keeps the raster crisp instead of upscaling one canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data || width === 0) return;
    let cancelled = false;
    let cancelRender = () => {};

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // pdf.js takes ownership of (and detaches) the buffer it is given, so a
        // copy is handed over - the original `data` stays intact for a re-render
        // at a new width without a refetch.
        const loadingTask = pdfjs.getDocument({ data: data.slice() });
        const doc = await loadingTask.promise;
        if (cancelled) return void loadingTask.destroy();

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas) return void loadingTask.destroy();

        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / unscaled.width });
        const dpr = window.devicePixelRatio || 1;
        const pxWidth = Math.floor(viewport.width * dpr);
        const pxHeight = Math.floor(viewport.height * dpr);

        // Only resize when the bitmap dimensions change: assigning canvas.width
        // clears it, so guarding the assignment keeps the prior frame visible
        // while a same-size live re-render computes.
        if (canvas.width !== pxWidth) canvas.width = pxWidth;
        if (canvas.height !== pxHeight) canvas.height = pxHeight;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const task = page.render({
          canvas,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        cancelRender = () => task.cancel();
        await task.promise;
        void loadingTask.destroy();
        if (!cancelled) setStatus("ready");
      } catch {
        // A cancelled render rejects; ignore it, surface anything else through
        // the error overlay. Not logged: a render cut off by navigating away
        // rejects like a real failure, so logging it would just be navigation
        // noise (and trips the e2e console guard).
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelRender();
    };
  }, [data, width]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className={status === "ready" ? "block" : "invisible"}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-neutral-400">
          {status === "error"
            ? `Could not render the ${label}.`
            : (loadingLabel ?? null)}
        </div>
      ) : null}
    </div>
  );
}
