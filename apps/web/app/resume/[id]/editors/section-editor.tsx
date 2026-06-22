"use client";

import { Trash2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { Section } from "@thomasar-cv/db/schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

import {
  emptyCustomItem,
  emptyEducationItem,
  emptyExperienceItem,
  emptyProjectItem,
  emptySkillsItem,
  emptySummaryItem,
  moveById,
  SECTION_ITEM_NOUN,
  SECTION_LABEL,
  toggleHidden,
  updateById,
} from "./content-ops";
import {
  AddButton,
  EditorPanel,
  HiddenMarker,
  ItemPanel,
  NodeControls,
} from "./editor-fields";
import {
  CustomItemEditor,
  EducationItemEditor,
  ExperienceItemEditor,
  ProjectItemEditor,
  SkillsItemEditor,
} from "./section-item-editors";
import { readText } from "./text";

// Re-stamping one field on a discriminated-union value drops the link to its
// `type` discriminant, so TS can't prove the result is the same member. Only the
// title changes here, so the cast is sound.
function withTitle(section: Section, title: string): Section {
  return { ...section, title } as Section;
}

/**
 * One section: an editable heading, its entries, and a remove control. The title
 * input is the only heading - the mono type tag that used to stack the same word
 * above it is gone (#51). The section's type shows through as the title's
 * placeholder, so an untitled section still reads as what it is without a second
 * heading layer.
 */
export function SectionEditor({
  section,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  section: Section;
  onChange: (update: (section: Section) => Section) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <EditorPanel>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            value={readText(section.title)}
            onChange={(e) => onChange((s) => withTitle(s, e.target.value))}
            aria-label={`${SECTION_LABEL[section.type]} section title`}
            placeholder={SECTION_LABEL[section.type]}
            spellCheck={false}
            className={cn(
              "-ml-1.5 min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-0.5 text-lg font-semibold tracking-tight outline-none transition-colors placeholder:text-muted-foreground/50 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
              section.hidden && "text-muted-foreground",
            )}
          />
          {section.hidden ? <HiddenMarker /> : null}
          <NodeControls
            label={`${SECTION_LABEL[section.type]} section`}
            hidden={section.hidden}
            isFirst={isFirst}
            isLast={isLast}
            onMove={onMove}
            onToggleHidden={() => onChange(toggleHidden)}
          />
          <RemoveSectionButton
            sectionLabel={SECTION_LABEL[section.type]}
            title={readText(section.title)}
            onRemove={onRemove}
          />
        </div>

        <div
          className={cn(
            "transition-opacity",
            section.hidden && "opacity-45",
          )}
        >
          <SectionBody section={section} onChange={onChange} />
        </div>
      </div>
    </EditorPanel>
  );
}

/**
 * The body of a section. A summary is a single block of prose, so it renders as
 * one bare textarea - no entry list, no field label, no "add line" (#51). Every
 * other type is a list of entries, dispatched on `type` so each kind gets its
 * precise item editor; each branch is narrowed, so spreading the section back
 * with its own item array stays type-safe without a cast.
 */
function SectionBody({
  section,
  onChange,
}: {
  section: Section;
  onChange: (update: (section: Section) => Section) => void;
}) {
  if (section.type === "summary") {
    return <SummaryBody section={section} onChange={onChange} />;
  }

  const noun = SECTION_ITEM_NOUN[section.type];
  // Prefix item control labels with the section's name so two sections that share
  // a noun (education and custom both use "entry") don't produce the same
  // accessible name; the title is the natural handle, falling back to the type.
  const sectionName = readText(section.title) || SECTION_LABEL[section.type];

  // Each branch passes the same item updater: it rewrites the section's items
  // against the section's *live* value inside `onChange`, so an edit never acts on
  // a captured snapshot. The cast mirrors withTitle - re-stamping `items` on a
  // union member drops the link to the `type` discriminant, but only `items`
  // changes, so it is sound. It is inlined per branch (not hoisted) because the
  // narrowed `section` is what makes `fn` line up with the branch's item type.
  switch (section.type) {
    case "experience":
      return (
        <SectionItems
          items={section.items}
          update={(fn) =>
            onChange((s) => ({ ...s, items: fn((s as typeof section).items) }) as Section)
          }
          makeEmpty={emptyExperienceItem}
          noun={noun}
          sectionName={sectionName}
          renderItem={(item, set) => (
            <ExperienceItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "education":
      return (
        <SectionItems
          items={section.items}
          update={(fn) =>
            onChange((s) => ({ ...s, items: fn((s as typeof section).items) }) as Section)
          }
          makeEmpty={emptyEducationItem}
          noun={noun}
          sectionName={sectionName}
          renderItem={(item, set) => (
            <EducationItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "skills":
      return (
        <SectionItems
          items={section.items}
          update={(fn) =>
            onChange((s) => ({ ...s, items: fn((s as typeof section).items) }) as Section)
          }
          makeEmpty={emptySkillsItem}
          noun={noun}
          sectionName={sectionName}
          renderItem={(item, set) => (
            <SkillsItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "projects":
      return (
        <SectionItems
          items={section.items}
          update={(fn) =>
            onChange((s) => ({ ...s, items: fn((s as typeof section).items) }) as Section)
          }
          makeEmpty={emptyProjectItem}
          noun={noun}
          sectionName={sectionName}
          renderItem={(item, set) => (
            <ProjectItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "custom":
      return (
        <SectionItems
          items={section.items}
          update={(fn) =>
            onChange((s) => ({ ...s, items: fn((s as typeof section).items) }) as Section)
          }
          makeEmpty={emptyCustomItem}
          noun={noun}
          sectionName={sectionName}
          renderItem={(item, set) => (
            <CustomItemEditor item={item} onChange={set} />
          )}
        />
      );
  }
}

/**
 * A summary is one text node by the schema's own design (a section whose `items`
 * holds exactly one entry), so the editor exposes it as a single textarea bound
 * to that entry. The first entry is edited in place and any further entries are
 * left untouched, so a legacy multi-entry summary loses nothing; a never-touched
 * empty section seeds one entry on first keystroke.
 */
function SummaryBody({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "summary" }>;
  onChange: (update: (section: Section) => Section) => void;
}) {
  const first = section.items[0];
  return (
    <Textarea
      aria-label="Summary"
      value={first ? readText(first.text) : ""}
      onChange={(e) =>
        onChange((s) => {
          const items = (s as typeof section).items;
          const base = items[0] ?? emptySummaryItem();
          return {
            ...s,
            items: [{ ...base, text: e.target.value }, ...items.slice(1)],
          } as Section;
        })
      }
      placeholder="A few lines on who you are and what you do."
      className="min-h-20"
    />
  );
}

function SectionItems<I extends { id: string; hidden: boolean }>({
  items,
  update,
  makeEmpty,
  renderItem,
  noun,
  sectionName,
}: {
  items: I[];
  update: (fn: (items: I[]) => I[]) => void;
  makeEmpty: () => I;
  renderItem: (item: I, onChange: (item: I) => void) => ReactNode;
  noun: string;
  sectionName: string;
}) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="divide-y divide-foreground/10">
          {items.map((item, i) => (
            <ItemPanel
              key={item.id}
              // Numbered by current slot for a readable name, prefixed with the
              // section so it stays distinct across sections ("Move Experience
              // role 2 up"). The operations below key off the stable `item.id`,
              // not this index, so a concurrent reorder can't make them act on the
              // wrong entry.
              label={`${sectionName} ${noun} ${i + 1}`}
              hidden={item.hidden}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              onMove={(delta) =>
                update((live) => moveById(live, item.id, delta))
              }
              onToggleHidden={() =>
                update((live) => updateById(live, item.id, toggleHidden))
              }
              onRemove={() =>
                update((live) => live.filter((entry) => entry.id !== item.id))
              }
            >
              {renderItem(item, (next) =>
                update((live) => updateById(live, item.id, () => next)),
              )}
            </ItemPanel>
          ))}
        </div>
      )}
      <AddButton onClick={() => update((live) => [...live, makeEmpty()])}>
        {`Add ${noun}`}
      </AddButton>
    </div>
  );
}

function RemoveSectionButton({
  sectionLabel,
  title,
  onRemove,
}: {
  sectionLabel: string;
  title: string;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${sectionLabel} section`}
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this section?</DialogTitle>
          <DialogDescription>
            “{title || sectionLabel}” and everything in it is removed from the
            document. Nothing is persisted until you save.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep section
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            Remove section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
