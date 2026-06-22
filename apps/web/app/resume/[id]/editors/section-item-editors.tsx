"use client";

import type {
  CustomItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SkillsItem,
  SummaryItem,
} from "@thomasar-cv/db/schema";

import { Button } from "@/components/ui/button";

import { DateRangeField } from "./date-range-field";
import { StringListField, TextAreaField, TextField } from "./editor-fields";
import { readOptional, readText, toOptional } from "./text";

/**
 * The fields for one entry of each section type, matching `resume-content.ts`.
 * Each takes a controlled item and reports the whole next item up; the section
 * editor owns where it sits in the list. List values (bullets, details, skills)
 * are stored as the plain strings they already are - the i18n seam is left
 * untouched (v1 is single-language).
 */

export function SummaryItemEditor({
  item,
  onChange,
}: {
  item: SummaryItem;
  onChange: (item: SummaryItem) => void;
}) {
  return (
    <TextAreaField
      label="Summary"
      value={readText(item.text)}
      onChange={(text) => onChange({ ...item, text })}
      placeholder="A few lines on who you are and what you do."
    />
  );
}

export function ExperienceItemEditor({
  item,
  onChange,
}: {
  item: ExperienceItem;
  onChange: (item: ExperienceItem) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Company"
          value={readText(item.company)}
          onChange={(company) => onChange({ ...item, company })}
          placeholder="Acme Corp"
        />
        <TextField
          label="Title"
          value={readText(item.title)}
          onChange={(title) => onChange({ ...item, title })}
          placeholder="Senior Engineer"
        />
        <TextField
          label="Context"
          hint="optional"
          value={readOptional(item.context)}
          onChange={(value) =>
            onChange({ ...item, context: toOptional(value) })
          }
          placeholder="e.g. Series B logistics platform"
        />
        <TextField
          label="Location"
          hint="optional"
          value={readOptional(item.location)}
          onChange={(value) =>
            onChange({ ...item, location: toOptional(value) })
          }
          placeholder="Remote"
        />
      </div>
      <DateRangeField
        value={item.dateRange}
        onChange={(dateRange) => onChange({ ...item, dateRange })}
        defaultMode="range"
      />
      <StringListField
        label="Highlights"
        multiline
        items={item.bullets.map(readText)}
        onChange={(bullets) => onChange({ ...item, bullets })}
        placeholder="What you did and the impact it had."
        addLabel="Add highlight"
      />
    </>
  );
}

export function EducationItemEditor({
  item,
  onChange,
}: {
  item: EducationItem;
  onChange: (item: EducationItem) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Institution"
          value={readText(item.institution)}
          onChange={(institution) => onChange({ ...item, institution })}
          placeholder="State University"
        />
        <TextField
          label="Degree"
          value={readText(item.degree)}
          onChange={(degree) => onChange({ ...item, degree })}
          placeholder="BSc Computer Science"
        />
        <TextField
          label="Location"
          hint="optional"
          value={readOptional(item.location)}
          onChange={(value) =>
            onChange({ ...item, location: toOptional(value) })
          }
          placeholder="Remote"
        />
      </div>
      <DateRangeField
        value={item.dateRange}
        onChange={(dateRange) => onChange({ ...item, dateRange })}
        defaultMode="single"
      />
      <StringListField
        label="Details"
        multiline
        items={item.details.map(readText)}
        onChange={(details) => onChange({ ...item, details })}
        placeholder="Honours, coursework, GPA, …"
        addLabel="Add detail"
      />
    </>
  );
}

export function SkillsItemEditor({
  item,
  onChange,
}: {
  item: SkillsItem;
  onChange: (item: SkillsItem) => void;
}) {
  return (
    <>
      <TextField
        label="Category"
        hint="optional"
        value={readOptional(item.category)}
        onChange={(value) => onChange({ ...item, category: toOptional(value) })}
        placeholder="e.g. Languages, Cloud"
      />
      <StringListField
        label="Skills"
        items={item.skills.map(readText)}
        onChange={(skills) => onChange({ ...item, skills })}
        placeholder="TypeScript"
        addLabel="Add skill"
      />
    </>
  );
}

export function ProjectItemEditor({
  item,
  onChange,
}: {
  item: ProjectItem;
  onChange: (item: ProjectItem) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          value={readText(item.name)}
          onChange={(name) => onChange({ ...item, name })}
          placeholder="résumé-as-data"
        />
        <TextField
          label="URL"
          hint="optional"
          type="url"
          inputMode="url"
          value={item.url ?? ""}
          onChange={(value) => onChange({ ...item, url: toOptional(value) })}
          placeholder="github.com/you/project"
        />
      </div>
      <TextAreaField
        label="Description"
        hint="optional"
        value={readOptional(item.description)}
        onChange={(value) =>
          onChange({ ...item, description: toOptional(value) })
        }
        placeholder="One line on what it is."
      />
      {item.dateRange ? (
        <div className="space-y-1">
          <DateRangeField
            value={item.dateRange}
            onChange={(dateRange) => onChange({ ...item, dateRange })}
            defaultMode="range"
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onChange({ ...item, dateRange: undefined })}
            className="text-muted-foreground hover:text-foreground"
          >
            Remove dates
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...item, dateRange: { end: null } })}
          className="text-muted-foreground hover:text-foreground"
        >
          Add dates
        </Button>
      )}
      <StringListField
        label="Highlights"
        multiline
        items={item.bullets.map(readText)}
        onChange={(bullets) => onChange({ ...item, bullets })}
        placeholder="What it does, what you built."
        addLabel="Add highlight"
      />
    </>
  );
}

export function CustomItemEditor({
  item,
  onChange,
}: {
  item: CustomItem;
  onChange: (item: CustomItem) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Heading"
          hint="optional"
          value={readOptional(item.heading)}
          onChange={(value) =>
            onChange({ ...item, heading: toOptional(value) })
          }
          placeholder="e.g. Languages"
        />
      </div>
      <TextAreaField
        label="Body"
        hint="optional"
        value={readOptional(item.body)}
        onChange={(value) => onChange({ ...item, body: toOptional(value) })}
        placeholder="Free text for this entry."
      />
      <StringListField
        label="Items"
        multiline
        items={item.bullets.map(readText)}
        onChange={(bullets) => onChange({ ...item, bullets })}
        placeholder="A bullet point."
        addLabel="Add item"
      />
    </>
  );
}
