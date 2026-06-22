"use client";

import { useState } from "react";

import type { DateRange, YearMonth } from "@thomasar-cv/db/schema";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

/**
 * Editing a `DateRange`, which overloads `end: null` to mean two things - an
 * ongoing role ("Present") and a date that simply isn't filled in. A single
 * segmented mode disambiguates them and also covers the third render rule, a lone
 * date (a graduation year: start omitted, end set):
 *   range   -> start - end
 *   ongoing -> start - Present   (end null)
 *   single  -> end               (start omitted)
 *
 * Mode is local state, seeded once, not derived on every render: while you fill a
 * range, an as-yet-empty end reads as `null`, which would otherwise flip the mode
 * to "ongoing" under you. New, empty items are ambiguous, so the caller picks the
 * starting mode that fits the section (a degree defaults to a single date).
 */
type DateMode = "range" | "ongoing" | "single";

const MODE_OPTIONS: { value: DateMode; label: string }[] = [
  { value: "range", label: "Range" },
  { value: "ongoing", label: "Ongoing" },
  { value: "single", label: "Single date" },
];

function deriveMode(value: DateRange, fallback: DateMode): DateMode {
  if (value.start === undefined && value.end === null) return fallback;
  if (value.end === null) return "ongoing";
  if (value.start === undefined) return "single";
  return "range";
}

// Build a minimal-key range: an absent bound is an absent key, never an explicit
// `undefined`, so the deep-equal dirty check and the Zod round-trip stay stable.
function buildRange(
  start: YearMonth | undefined,
  end: YearMonth | null,
): DateRange {
  const range: DateRange = { end };
  if (start !== undefined) range.start = start;
  return range;
}

export function DateRangeField({
  value,
  onChange,
  defaultMode,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  defaultMode: DateMode;
}) {
  const [mode, setMode] = useState(() => deriveMode(value, defaultMode));

  const start = value.start;
  const end = value.end ?? undefined;

  function emit(
    next: DateMode,
    nextStart: YearMonth | undefined,
    nextEnd: YearMonth | undefined,
  ) {
    switch (next) {
      case "range":
        return onChange(buildRange(nextStart, nextEnd ?? null));
      case "ongoing":
        return onChange(buildRange(nextStart, null));
      case "single":
        return onChange(buildRange(undefined, nextEnd ?? null));
    }
  }

  function changeMode(next: DateMode) {
    setMode(next);
    emit(next, start, end);
  }

  return (
    <div className="space-y-2">
      <Label>Dates</Label>
      <div
        role="group"
        aria-label="Date mode"
        className="inline-flex gap-0.5 rounded-md p-0.5 ring-1 ring-input"
      >
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeMode(option.value)}
            aria-pressed={mode === option.value}
            className={cn(
              "rounded-[0.3rem] px-2.5 py-1 text-xs font-medium transition-colors",
              mode === option.value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {mode === "single" ? (
          <YearMonthInput
            label="Date"
            value={end}
            onChange={(ym) => emit("single", undefined, ym)}
          />
        ) : (
          <>
            <YearMonthInput
              label="From"
              value={start}
              onChange={(ym) => emit(mode, ym, end)}
            />
            <span className="pb-2 text-sm text-muted-foreground">to</span>
            {mode === "ongoing" ? (
              <span className="pb-1.5 text-sm font-medium text-primary">
                Present
              </span>
            ) : (
              <YearMonthInput
                label="Until"
                value={end}
                onChange={(ym) => emit("range", start, ym)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function YearMonthInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YearMonth | undefined;
  onChange: (value: YearMonth | undefined) => void;
}) {
  const year = value?.year;
  const month = value?.month;

  function setYear(raw: string) {
    // Ignore non-digits rather than letting one wipe the field: `Number("2021a")`
    // is NaN, which would otherwise clear a typed year (and its month).
    const next = parseYear(raw.replace(/\D/g, ""));
    if (next === undefined) return onChange(undefined);
    onChange(month === undefined ? { year: next } : { year: next, month });
  }

  function setMonth(next: number | undefined) {
    // A month with no year isn't a valid `YearMonth`, so the select is disabled
    // until a year is typed; guard anyway.
    if (year === undefined) return;
    onChange(next === undefined ? { year } : { year, month: next });
  }

  return (
    <div className="space-y-2">
      <span className="block text-[0.7rem] text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input
          className="w-[4.5rem]"
          inputMode="numeric"
          placeholder="Year"
          aria-label={`${label} year`}
          spellCheck={false}
          value={year === undefined ? "" : String(year)}
          onChange={(e) => setYear(e.target.value)}
        />
        <MonthSelect
          value={month}
          onChange={setMonth}
          disabled={year === undefined}
          ariaLabel={`${label} month`}
        />
      </div>
    </div>
  );
}

function parseYear(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const year = Number(raw);
  return Number.isInteger(year) ? year : undefined;
}

const NO_MONTH = "none";

function MonthSelect({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value === undefined ? NO_MONTH : String(value)}
      onValueChange={(next) => {
        const selected = String(next);
        onChange(selected === NO_MONTH ? undefined : Number(selected));
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-36" aria-label={ariaLabel}>
        <SelectValue>
          {(selected) => {
            const month = String(selected);
            return month === NO_MONTH ? "Month" : MONTHS[Number(month) - 1];
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_MONTH}>Month</SelectItem>
        {MONTHS.map((name, i) => (
          <SelectItem key={name} value={String(i + 1)}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
