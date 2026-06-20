"use client";

import { EyeOffIcon, FileTextIcon, LayersIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import {
  resolveText,
  type ResumeHeader,
  type Section,
} from "@thomasar-cv/db/schema";

import { useEditor } from "./editor-context";

// v1 is single-language, so every value is a bare string and the locale is
// nominal (resolveText returns the string as-is). It becomes real with i18n.
const LOCALE = "en";

const SECTION_LABEL: Record<Section["type"], string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  custom: "Custom",
};

/**
 * The editor's working area: the document on the left, a live preview on the
 * right. Both are mount points for the rest of v0.3 - the left column hosts the
 * per-section field editors (#37) and reorder/hide controls (#38), the right the
 * render-engine preview (#39). Until then the left shows the document's structure
 * (read from the same in-memory state those editors will write) and the right
 * reserves the exact A4 slot the preview paints into.
 */
export function EditorWorkspace() {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <EditorColumn />
      <PreviewColumn />
    </div>
  );
}

function EditorColumn() {
  const { content } = useEditor();

  return (
    <div className="flex min-w-0 flex-col gap-6 duration-500 animate-in fade-in-0 slide-in-from-bottom-2">
      <HeaderOutline header={content.header} />
      <SectionsOutline sections={content.sections} />
      <p className="px-1 text-xs text-muted-foreground">
        Editing fields, reordering, and the live preview arrive next. For now the
        name above saves, and your edits are tracked.
      </p>
    </div>
  );
}

function HeaderOutline({ header }: { header: ResumeHeader }) {
  const fullName = resolveText(header.name, LOCALE).trim();

  return (
    <section className="rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10">
      <Eyebrow>Header</Eyebrow>
      <p className="mt-2 text-xl font-semibold tracking-tight">
        {fullName || (
          <span className="text-muted-foreground">No name yet</span>
        )}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {header.contacts.length}{" "}
        {header.contacts.length === 1 ? "contact" : "contacts"}
        {header.availability
          ? ` · ${resolveText(header.availability, LOCALE)}`
          : ""}
      </p>
    </section>
  );
}

function SectionsOutline({ sections }: { sections: Section[] }) {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <LayersIcon className="size-5" />
        </div>
        <p className="text-sm text-muted-foreground">
          This résumé has no sections yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Eyebrow>
        {sections.length} {sections.length === 1 ? "section" : "sections"}
      </Eyebrow>
      <ol className="flex flex-col gap-2.5">
        {sections.map((section, i) => (
          <li
            key={section.id}
            className="duration-500 fill-mode-both animate-in fade-in-0 slide-in-from-bottom-1"
            // The animate-in shorthand reads its delay from this var, so a plain
            // `animation-delay` would be reset by it; setting the var staggers cleanly.
            style={{ "--tw-animation-delay": `${i * 50}ms` } as CSSProperties}
          >
            <SectionCard section={section} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const title = resolveText(section.title, LOCALE);
  const count = section.items.length;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {title}
          {section.hidden ? (
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-muted-foreground">
              <EyeOffIcon className="size-3" />
              Hidden
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {SECTION_LABEL[section.type]} · {count}{" "}
          {count === 1 ? "item" : "items"}
        </p>
      </div>
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

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </p>
  );
}
