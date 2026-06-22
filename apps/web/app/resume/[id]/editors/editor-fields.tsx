"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

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

/** A ghost icon button sized for the control rail. */
function RailButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="hover:text-foreground"
    >
      {children}
    </Button>
  );
}

/**
 * The reorder + visibility cluster a section or an entry carries: move up, move
 * down, and a hide/show toggle. Moves disable at the ends of the list instead of
 * wrapping, so focus order stays predictable; every control is a real button, so
 * the cluster is fully keyboard-operable - drag-and-drop was explicitly optional
 * for #38. Remove stays a separate control: it is destructive and, for a section,
 * sits behind a confirm.
 *
 * `label` names the node ("Experience section", "Experience role 2") so each
 * button lands a distinct accessible name; the hide toggle's name flips with
 * state so a screen reader hears the action it will take, while the dimmed surface
 * and the `Hidden` marker carry the state itself.
 */
export function NodeControls({
  label,
  hidden,
  isFirst,
  isLast,
  onMove,
  onToggleHidden,
}: {
  label: string;
  hidden: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleHidden: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  // A move that lands the node at a list end disables the button that fired it,
  // and a disabled element can't keep focus, so a keyboard reorder would lose its
  // place. Once the move commits, if focus has dropped out of the rail, pull it
  // back to the first still-enabled control (the opposite arrow) so the next key
  // press continues the reorder instead of falling to <body>.
  const move = (delta: -1 | 1) => {
    onMove(delta);
    requestAnimationFrame(() => {
      const rail = railRef.current;
      if (!rail || rail.contains(document.activeElement)) return;
      rail.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    });
  };

  return (
    <div ref={railRef} className="flex items-center text-muted-foreground">
      <RailButton
        label={`Move ${label} up`}
        disabled={isFirst}
        onClick={() => move(-1)}
      >
        <ArrowUpIcon />
      </RailButton>
      <RailButton
        label={`Move ${label} down`}
        disabled={isLast}
        onClick={() => move(1)}
      >
        <ArrowDownIcon />
      </RailButton>
      <RailButton
        label={`${hidden ? "Show" : "Hide"} ${label}`}
        onClick={onToggleHidden}
      >
        {hidden ? <EyeIcon /> : <EyeOffIcon />}
      </RailButton>
    </div>
  );
}

/**
 * The tag a tailored-out node wears. Hidden nodes stay in the document and stay
 * editable (#38) - they are only dropped from the render - so the editor marks the
 * state instead of removing the card. Always shown when hidden (not hover-gated),
 * because it is the cue that explains the dimmed surface; pair it with that dim.
 */
export function HiddenMarker() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
      Hidden
    </span>
  );
}

/**
 * One entry inside a section (a role, a project, …). It is flat - no card of its
 * own - so an entry doesn't stack a third bordered surface inside the section
 * card and its inputs (#51); the section's entry list hairlines them apart
 * instead. The control rail (reorder, hide, remove) rides in the gutter gap above
 * the fields so it never overlaps them, and stays quiet until the row is hovered
 * or focused so a column of entries reads calm without hiding the affordances from
 * a keyboard user. The `Hidden` marker is the exception: it stays visible whenever
 * the entry is hidden, since it is what explains the dimmed fields.
 */
export function ItemPanel({
  label,
  hidden,
  isFirst,
  isLast,
  onMove,
  onToggleHidden,
  onRemove,
  children,
}: {
  label: string;
  hidden: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleHidden: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    // py-4 + the list's divider hairline separate one entry from the next; the
    // last collapses its bottom padding so the column sits flush to the card body.
    // The first keeps a small top gutter (pt-3, matching the rail's -top-3 pull)
    // rather than collapsing to zero, so the control rail has room above the first
    // field instead of riding over it.
    <div className="group/item relative py-4 first:pt-3 last:pb-0">
      {/* Pinned into the top gutter and right edge, on a card-coloured chip so it
          sits cleanly on the divider hairline rather than over the first field. */}
      <div className="absolute -top-3 right-0 z-10 flex items-center gap-1 rounded-md bg-card">
        {hidden ? <HiddenMarker /> : null}
        <div className="flex items-center opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100">
          <NodeControls
            label={label}
            hidden={hidden}
            isFirst={isFirst}
            isLast={isLast}
            onMove={onMove}
            onToggleHidden={onToggleHidden}
          />
          <RemoveButton trash label={`Remove ${label}`} onClick={onRemove} />
        </div>
      </div>
      <div
        className={cn(
          "space-y-4 transition-opacity",
          hidden && "opacity-45",
        )}
      >
        {children}
      </div>
    </div>
  );
}
