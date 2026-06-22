"use client";

import { useMemo } from "react";

import { PdfCanvas } from "@/components/pdf-canvas";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The standalone preview's paper: the server's base64 PDF (issue #18) decoded
 * once and painted by the shared {@link PdfCanvas}, the same painter the editor's
 * live preview uses. The bytes come from `renderResumeToBuffer`, so this is the
 * export rasterized, not a second layout (ADR 0002).
 */
export function PdfPreview({ base64 }: { base64: string }) {
  const data = useMemo(() => base64ToBytes(base64), [base64]);

  return (
    <div className="aspect-[210/297] w-full max-w-[800px] bg-white shadow-2xl shadow-black/60 ring-1 ring-black/10">
      <PdfCanvas data={data} loadingLabel="Loading preview…" />
    </div>
  );
}
