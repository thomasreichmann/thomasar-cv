"use client";

import { ChevronDownIcon, PlusIcon } from "lucide-react";
import type { CSSProperties } from "react";

import type { SectionType } from "@thomasar-cv/db/schema";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEditor } from "./editor-context";
import {
  emptySection,
  moveAt,
  SECTION_LABEL,
  SECTION_TYPES,
} from "./editors/content-ops";
import { HeaderEditor } from "./editors/header-editor";
import { SectionEditor } from "./editors/section-editor";

/**
 * The left column: the whole document as editable fields. It owns the writes into
 * the in-memory content document (#40) - every header and section editor below is
 * a controlled component, so this is the only place `updateContent` is called and
 * the editors themselves stay free of the context.
 */
export function EditorColumn() {
  const { content, updateContent } = useEditor();
  const { header, sections } = content;

  return (
    <div className="flex min-w-0 flex-col gap-6 duration-500 animate-in fade-in-0 slide-in-from-bottom-2">
      <HeaderEditor
        header={header}
        onChange={(next) =>
          updateContent((prev) => ({ ...prev, header: next }))
        }
      />

      {sections.map((section, i) => (
        <div
          key={section.id}
          className="duration-500 fill-mode-both animate-in fade-in-0 slide-in-from-bottom-1"
          // The animate-in shorthand reads its delay from this var; setting it
          // staggers the section cards on first paint.
          style={{ "--tw-animation-delay": `${i * 60}ms` } as CSSProperties}
        >
          <SectionEditor
            section={section}
            isFirst={i === 0}
            isLast={i === sections.length - 1}
            onChange={(next) =>
              updateContent((prev) => ({
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === section.id ? next : s,
                ),
              }))
            }
            // Reorder resolves the section's live index inside the updater rather
            // than closing over `i`: a stale `i` from a render before the previous
            // move would shift the wrong section. `id` is stable, so this is exact.
            onMoveUp={() =>
              updateContent((prev) => {
                const at = prev.sections.findIndex((s) => s.id === section.id);
                return { ...prev, sections: moveAt(prev.sections, at, at - 1) };
              })
            }
            onMoveDown={() =>
              updateContent((prev) => {
                const at = prev.sections.findIndex((s) => s.id === section.id);
                return { ...prev, sections: moveAt(prev.sections, at, at + 1) };
              })
            }
            onRemove={() =>
              updateContent((prev) => ({
                ...prev,
                sections: prev.sections.filter((s) => s.id !== section.id),
              }))
            }
          />
        </div>
      ))}

      <AddSectionMenu
        onAdd={(type) =>
          updateContent((prev) => ({
            ...prev,
            sections: [...prev.sections, emptySection(type)],
          }))
        }
      />
    </div>
  );
}

function AddSectionMenu({ onAdd }: { onAdd: (type: SectionType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-center border-dashed text-muted-foreground hover:text-foreground"
          />
        }
      >
        <PlusIcon />
        Add section
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {SECTION_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            {SECTION_LABEL[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
