"use client";

import { FileTextIcon } from "lucide-react";

import { EditorColumn } from "./editor-column";
import { Eyebrow } from "./editors/editor-fields";

/**
 * The editor's working area: the document on the left, a live preview on the
 * right. The left column is the content editors (#37); the right reserves the
 * exact A4 slot the render-engine preview (#39) paints into.
 */
export function EditorWorkspace() {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <EditorColumn />
      <PreviewColumn />
    </div>
  );
}

/**
 * The preview slot (#39). It stays light - a résumé is a printed, ATS-parsed
 * document, not chrome (ADR 0002/0003) - and mirrors the real preview's paper
 * styling so the render drops straight in. Sticky beside a long document.
 */
function PreviewColumn() {
  return (
    <aside className="duration-700 animate-in fade-in-0 xl:sticky xl:top-20 xl:self-start">
      <Eyebrow>Preview</Eyebrow>
      <div className="mt-3 flex aspect-[210/297] w-full items-center justify-center rounded-sm bg-white text-neutral-400 shadow-2xl shadow-black/60 ring-1 ring-black/10">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileTextIcon className="size-6" />
          <p className="text-sm font-medium text-neutral-500">Live preview</p>
          <p className="text-xs">Renders here as you edit</p>
        </div>
      </div>
    </aside>
  );
}
