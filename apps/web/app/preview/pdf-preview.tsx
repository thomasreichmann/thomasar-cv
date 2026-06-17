"use client";

import { useEffect, useRef, useState } from "react";

/** On-screen width of the rendered page, in CSS pixels. */
const TARGET_WIDTH = 800;
/** A4 aspect ratio (297mm / 210mm), used to size the loading placeholder. */
const A4_RATIO = 297 / 210;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Renders PDF bytes to a canvas with pdf.js. We render with the same library
 * that issue #20 will use to extract the text layer, so the picture on screen
 * is exactly what the ATS check inspects. pdf.js is loaded lazily in the effect
 * (browser only) so it never runs during SSR.
 */
export function PdfPreview({ base64 }: { base64: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    let cancelRender = () => {};

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const loadingTask = pdfjs.getDocument({ data: base64ToBytes(base64) });
        const doc = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas) {
          void loadingTask.destroy();
          return;
        }

        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: TARGET_WIDTH / unscaled.width,
        });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
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
      } catch (error) {
        // A cancelled render rejects; ignore it, surface anything else.
        if (!cancelled) {
          console.error("Failed to render résumé preview", error);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelRender();
    };
  }, [base64]);

  return (
    <div className="bg-white shadow-lg ring-1 ring-black/5">
      <canvas
        ref={canvasRef}
        className={status === "ready" ? "block" : "hidden"}
      />
      {status !== "ready" ? (
        <div
          className="flex items-center justify-center text-sm text-neutral-400"
          style={{ width: TARGET_WIDTH, height: TARGET_WIDTH * A4_RATIO }}
        >
          {status === "error"
            ? "Could not render the preview."
            : "Loading preview…"}
        </div>
      ) : null}
    </div>
  );
}
