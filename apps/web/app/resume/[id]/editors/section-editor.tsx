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

import {
  emptyCustomItem,
  emptyEducationItem,
  emptyExperienceItem,
  emptyProjectItem,
  emptySkillsItem,
  emptySummaryItem,
  removeAt,
  replaceAt,
  SECTION_ITEM_NOUN,
  SECTION_LABEL,
} from "./content-ops";
import { AddButton, EditorPanel, Eyebrow, ItemPanel } from "./editor-fields";
import {
  CustomItemEditor,
  EducationItemEditor,
  ExperienceItemEditor,
  ProjectItemEditor,
  SkillsItemEditor,
  SummaryItemEditor,
} from "./section-item-editors";
import { readText } from "./text";

// Re-stamping one field on a discriminated-union value drops the link to its
// `type` discriminant, so TS can't prove the result is the same member. Only the
// title changes here, so the cast is sound.
function withTitle(section: Section, title: string): Section {
  return { ...section, title } as Section;
}

/** One section: its type tag, an editable heading, its entries, and a remove control. */
export function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: Section;
  onChange: (section: Section) => void;
  onRemove: () => void;
}) {
  return (
    <EditorPanel className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Eyebrow>{SECTION_LABEL[section.type]}</Eyebrow>
          <input
            value={readText(section.title)}
            onChange={(e) => onChange(withTitle(section, e.target.value))}
            aria-label={`${SECTION_LABEL[section.type]} section title`}
            placeholder="Section title"
            spellCheck={false}
            className="-ml-1.5 w-full truncate rounded-md bg-transparent px-1.5 py-0.5 text-lg font-semibold tracking-tight outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <RemoveSectionButton
          sectionLabel={SECTION_LABEL[section.type]}
          title={readText(section.title)}
          onRemove={onRemove}
        />
      </div>

      <SectionBody section={section} onChange={onChange} />
    </EditorPanel>
  );
}

/**
 * The entries for a section, dispatched on `type` so each kind gets its precise
 * item editor. Each branch is narrowed, so spreading the section back with its own
 * item array stays type-safe without a cast.
 */
function SectionBody({
  section,
  onChange,
}: {
  section: Section;
  onChange: (section: Section) => void;
}) {
  const noun = SECTION_ITEM_NOUN[section.type];
  const addLabel = `Add ${noun}`;
  const removeLabel = `Remove ${noun}`;

  switch (section.type) {
    case "summary":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptySummaryItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <SummaryItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "experience":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptyExperienceItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <ExperienceItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "education":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptyEducationItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <EducationItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "skills":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptySkillsItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <SkillsItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "projects":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptyProjectItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <ProjectItemEditor item={item} onChange={set} />
          )}
        />
      );
    case "custom":
      return (
        <SectionItems
          items={section.items}
          onChange={(items) => onChange({ ...section, items })}
          makeEmpty={emptyCustomItem}
          addLabel={addLabel}
          removeLabel={removeLabel}
          renderItem={(item, set) => (
            <CustomItemEditor item={item} onChange={set} />
          )}
        />
      );
  }
}

function SectionItems<I extends { id: string }>({
  items,
  onChange,
  makeEmpty,
  renderItem,
  addLabel,
  removeLabel,
}: {
  items: I[];
  onChange: (items: I[]) => void;
  makeEmpty: () => I;
  renderItem: (item: I, onChange: (item: I) => void) => ReactNode;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <ItemPanel
              key={item.id}
              removeLabel={removeLabel}
              onRemove={() => onChange(removeAt(items, i))}
            >
              {renderItem(item, (next) => onChange(replaceAt(items, i, next)))}
            </ItemPanel>
          ))}
        </div>
      )}
      <AddButton onClick={() => onChange([...items, makeEmpty()])}>
        {addLabel}
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
