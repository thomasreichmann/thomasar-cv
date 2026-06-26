"use client";

import {
  themeAccent,
  themeDensity,
  themeScale,
  themeSpacing,
  type ResumeTheme,
  type ThemeAccent,
} from "@thomasar-cv/db/schema";
// The canonical accent inks, imported (not copied) so the swatch can't drift from
// what actually prints. This is the render package's `theme.ts` reached through a
// react-pdf-free subpath, so the editor bundle gets five hex strings without the
// render graph. Shown as ink on a white chip so every accent (graphite included)
// stays visible on the dark editor surface and reads as "ink on paper".
import { ACCENT } from "@thomasar-cv/render/theme";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { EditorPanel, Eyebrow } from "./editor-fields";

/**
 * The theme controls (#53): a bounded panel that sets how the paper looks, wired
 * to the in-memory theme so the live preview re-renders through the one shared
 * render definition (ADR 0002/0006). Every control is a closed choice - segmented
 * for the ordered scales, a swatch row for the accent - never a freeform number or
 * color, which is the whole premise of the model: a user can only pick a look that
 * still fits one clean A4 page and stays ATS-safe.
 *
 * density and spacing read alike but are different axes (leading *within* text vs
 * air *between* blocks); the hints name the difference so the two controls don't
 * collapse into one in the user's head.
 */

const ACCENT_LABEL: Record<ThemeAccent, string> = {
  graphite: "Graphite",
  rust: "Rust",
  navy: "Navy",
  forest: "Forest",
  plum: "Plum",
};

/** Title-case a bounded enum value for display (the values are already words). */
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Segmented styling shared by the three ordered scales (density, spacing, scale). */
const segmentedContainer =
  "inline-flex rounded-lg bg-muted/40 p-0.5 ring-1 ring-foreground/10";
const segmentedOption = (selected: boolean) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    selected
      ? "bg-card text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
  );

export function ThemeEditor({
  theme,
  onChange,
}: {
  theme: ResumeTheme;
  onChange: (theme: ResumeTheme) => void;
}) {
  // Each control is written out rather than looped: a dynamic `[key]: value`
  // setter would erase the per-control type that keeps "density" from ever
  // receiving a "scale" value. The segmented look is shared above.
  return (
    <EditorPanel>
      <div className="space-y-4">
        <Eyebrow>Appearance</Eyebrow>

        <ChoiceGroup
          label="Density"
          hint="line spacing within text"
          value={theme.density}
          options={themeDensity.options}
          onChange={(density) => onChange({ ...theme, density })}
          containerClassName={segmentedContainer}
          optionClassName={segmentedOption}
          renderOption={title}
        />
        <ChoiceGroup
          label="Spacing"
          hint="space between sections"
          value={theme.spacing}
          options={themeSpacing.options}
          onChange={(spacing) => onChange({ ...theme, spacing })}
          containerClassName={segmentedContainer}
          optionClassName={segmentedOption}
          renderOption={title}
        />
        <ChoiceGroup
          label="Scale"
          hint="overall type size"
          value={theme.scale}
          options={themeScale.options}
          onChange={(scale) => onChange({ ...theme, scale })}
          containerClassName={segmentedContainer}
          optionClassName={segmentedOption}
          renderOption={title}
        />

        <ChoiceGroup
          label="Accent"
          hint="name and section headings"
          value={theme.accent}
          options={themeAccent.options}
          onChange={(accent) => onChange({ ...theme, accent })}
          optionLabel={(accent) => ACCENT_LABEL[accent]}
          containerClassName="flex flex-wrap items-center gap-2"
          optionClassName={(selected) =>
            cn(
              "grid size-8 place-items-center rounded-full bg-white ring-1 ring-black/10 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )
          }
          renderOption={(accent) => (
            <span
              aria-hidden
              className="size-4 rounded-full"
              style={{ backgroundColor: ACCENT[accent] }}
            />
          )}
        />
      </div>
    </EditorPanel>
  );
}

/**
 * A single-select control as a proper radiogroup: arrow keys move (and select, as
 * radios do), roving tabindex keeps the group one tab stop, and only the checked
 * option is reachable by Tab. The visual is left to the caller (`optionClassName`,
 * `renderOption`) so the same keyboard/ARIA core serves both the segmented scales
 * and the accent swatches without duplicating the easy-to-get-wrong part.
 */
function ChoiceGroup<T extends string>({
  label: groupLabel,
  hint,
  value,
  options,
  onChange,
  renderOption,
  optionLabel,
  containerClassName,
  optionClassName,
}: {
  label: string;
  hint?: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderOption: (option: T, selected: boolean) => ReactNode;
  /** Accessible name per option when `renderOption` is non-textual (swatches). */
  optionLabel?: (option: T) => string;
  containerClassName?: string;
  optionClassName?: (selected: boolean) => string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hintId = useId();

  const move = (delta: 1 | -1) => {
    const i = options.indexOf(value);
    const next = (i + delta + options.length) % options.length;
    const nextValue = options[next];
    if (nextValue === undefined) return;
    onChange(nextValue);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        {/* A radiogroup has no single control to bind a <label> to, so the title
            is a span, named onto the group via aria-label below. */}
        <span className="text-sm leading-none font-medium">{groupLabel}</span>
        {hint ? (
          <span
            id={hintId}
            className="text-xs font-normal text-muted-foreground"
          >
            {hint}
          </span>
        ) : null}
      </div>
      {/* The hint is described, not named: it carries the density-vs-spacing
          distinction, which is lost to a screen reader if it stays purely visual. */}
      <div
        role="radiogroup"
        aria-label={groupLabel}
        aria-describedby={hint ? hintId : undefined}
        className={containerClassName}
        onKeyDown={onKeyDown}
      >
        {options.map((option, i) => {
          const selected = option === value;
          return (
            <button
              key={option}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={optionLabel?.(option)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option)}
              className={optionClassName?.(selected)}
            >
              {renderOption(option, selected)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
