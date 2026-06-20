import { describe, expect, it } from "vitest";

import { formatUpdatedAt } from "./relative-time";

const now = new Date("2026-06-20T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatUpdatedAt", () => {
  it("collapses anything under a minute to 'just now'", () => {
    expect(formatUpdatedAt(ago(30 * SECOND), now)).toBe("just now");
  });

  it("counts minutes and hours within the day", () => {
    expect(formatUpdatedAt(ago(5 * MINUTE), now)).toBe("5 minutes ago");
    expect(formatUpdatedAt(ago(3 * HOUR), now)).toBe("3 hours ago");
  });

  it("says 'yesterday' a day back and counts days within the week", () => {
    expect(formatUpdatedAt(ago(DAY), now)).toBe("yesterday");
    expect(formatUpdatedAt(ago(3 * DAY), now)).toBe("3 days ago");
  });

  it("falls back to an absolute date past a week", () => {
    // Asserted by shape, not exact day: the absolute formatter renders in the
    // runner's local timezone, which can nudge the calendar day by one.
    expect(formatUpdatedAt(ago(30 * DAY), now)).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, 2026$/,
    );
  });
});
