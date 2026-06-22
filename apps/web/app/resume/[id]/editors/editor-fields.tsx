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
 */

/** A mono, wide-tracked label - the spec-sheet voice used for tags and headings. */
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
        "rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span className="text-[0.7rem] text-muted-foreground">{hint}</span>
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
  type?: "text" | "url";
  inputMode?: "text" | "url" | "email";
  spellCheck?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
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
        <ul className="space-y-1.5">
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
 * One entry inside a section (a role, a project, …). The remove control sits
 * quiet until the row is hovered or focused, so a column of entries stays calm
 * but never hides the affordance from a keyboard user.
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
    <div className="group/item relative rounded-lg bg-background/40 p-4 pr-10 ring-1 ring-foreground/10">
      <div className="space-y-3">{children}</div>
      <RemoveButton
        trash
        label={removeLabel}
        onClick={onRemove}
        className="absolute top-2 right-2 opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
      />
    </div>
  );
}
