"use client";

import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

import { removeAt, replaceAt } from "./content-ops";

/**
 * The shared vocabulary of the content editors: one card per section, a mono
 * eyebrow tag, labelled fields, and add/remove affordances. The look extends the
 * Oxide chrome the editor shell already established (card surfaces hairlined with
 * `ring-foreground/10`, burnt-rust used sparingly), so the editors read as one
 * instrument rather than a bolted-on form.
 *
 * Spacing is one scale, not a per-component guess (#51). Layout gaps come from
 * three steps - 2 (label/control), 4 (field/field, grids, card body), 6 (card
 * padding, section/section) - and only the *anatomy* of a single control (an
 * input's padding, the date toggle's seams) sits off it.
 */

/** A mono, wide-tracked label - the spec-sheet voice used for card eyebrows. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </p>
  );
}

/** The outer card a header or section editor lives in. */
export function EditorPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * Constrain a short field so a name or a category doesn't stretch the full column
 * width (#51). A value with no natural max (a summary line, a link) keeps the
 * default full width by leaving `width` unset.
 */
export type FieldWidth = "sm" | "xs";
const FIELD_WIDTH: Record<FieldWidth, string> = {
  sm: "max-w-sm",
  xs: "max-w-[12rem]",
};

function Field({
  label,
  hint,
  htmlFor,
  width,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  width?: FieldWidth;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", width && FIELD_WIDTH[width])}>
      {/* The hint rides next to its label, not floated to the far edge of a wide
          field where it reads as unrelated chrome (#51). */}
      <div className="flex items-baseline gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  width,
  type = "text",
  inputMode,
  spellCheck,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  width?: FieldWidth;
  type?: "text" | "url";
  inputMode?: "text" | "url" | "email";
  spellCheck?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} width={width}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        spellCheck={spellCheck}
        autoComplete={autoComplete}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

/**
 * An add/edit/remove list of plain strings - the bullets, details and skills the
 * schema models as `LocalizedText[]`. Rows key by index because the values carry
 * no id; that is sound while there is no reordering (reorder is #38).
 */
export function StringListField({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
  multiline = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-[0.9rem] size-1 shrink-0 rounded-full bg-primary/70"
              />
              {multiline ? (
                <Textarea
                  value={item}
                  onChange={(e) =>
                    onChange(replaceAt(items, i, e.target.value))
                  }
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                  className="min-h-9"
                />
              ) : (
                <Input
                  value={item}
                  onChange={(e) =>
                    onChange(replaceAt(items, i, e.target.value))
                  }
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                />
              )}
              <RemoveButton
                label={`Remove ${label} ${i + 1}`}
                onClick={() => onChange(removeAt(items, i))}
                className="mt-1"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <AddButton onClick={() => onChange([...items, ""])}>{addLabel}</AddButton>
    </div>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
    >
      <PlusIcon />
      {children}
    </Button>
  );
}

export function RemoveButton({
  onClick,
  label,
  className,
  trash = false,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  trash?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      {trash ? <Trash2Icon /> : <XIcon />}
    </Button>
  );
}

/**
 * One entry inside a section (a role, a project, …). It is flat - no card of its
 * own - so an entry doesn't stack a third bordered surface inside the section
 * card and its inputs (#51); the section's entry list hairlines them apart
 * instead. The remove control sits quiet until the row is hovered or focused, so
 * a column of entries stays calm but never hides the affordance from a keyboard
 * user.
 */
export function ItemPanel({
  onRemove,
  removeLabel,
  children,
}: {
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    // py-4 + the list's divider hairline separate one entry from the next; the
    // first/last collapse their outer padding so entries sit flush to the card
    // body. The relative wrapper starts after that padding, so the remove control
    // aligns to the first field whether or not this is the first entry.
    <div className="group/item py-4 first:pt-0 last:pb-0">
      <div className="relative pr-10">
        <div className="space-y-4">{children}</div>
        <RemoveButton
          trash
          label={removeLabel}
          onClick={onRemove}
          className="absolute top-0 right-0 opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
        />
      </div>
    </div>
  );
}
