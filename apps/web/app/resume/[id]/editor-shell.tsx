"use client";

import { EditorColumn } from "./editor-column";
import { LivePreview } from "./live-preview";

/**
 * The editor's working area: the document on the left, a live preview on the
 * right. The left column is the content editors (#37); the right is the
 * render-engine preview (#39), painted from the same bytes the export ships.
 */
export function EditorWorkspace() {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <EditorColumn />
      <LivePreview />
    </div>
  );
}
