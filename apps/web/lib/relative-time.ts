const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// `numeric: "auto"` is what turns -1 day into "yesterday" rather than "1 day ago".
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * "Last updated" label for a résumé row: a relative phrase within the past week
 * ("3 days ago"), then an absolute date. Recent edits are the work the user just
 * did, so a relative phrase reads best; older résumés are clearer pinned to a
 * real date than left as a vague "2 months ago". `now` is injectable so the
 * choice of bucket is testable without mocking the clock.
 */
export function formatUpdatedAt(date: Date, now: Date = new Date()): string {
  const elapsed = date.getTime() - now.getTime(); // negative: in the past
  const ago = Math.abs(elapsed);

  if (ago < MINUTE) return "just now";
  if (ago < HOUR) return relative.format(Math.round(elapsed / MINUTE), "minute");
  if (ago < DAY) return relative.format(Math.round(elapsed / HOUR), "hour");
  if (ago < WEEK) return relative.format(Math.round(elapsed / DAY), "day");
  return absolute.format(date);
}
