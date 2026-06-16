import { TRPCError } from "@trpc/server";

/**
 * The single failure mode for ownership-scoped access. A row the caller does not
 * own and a row that does not exist BOTH surface as NOT_FOUND - never FORBIDDEN -
 * so a caller cannot tell "exists but not yours" from "no such row" and therefore
 * cannot probe which ids are real. Every owned-table helper funnels its misses
 * through here so that distinction can never leak from one call site.
 */
export function notFound(): never {
  throw new TRPCError({ code: "NOT_FOUND" });
}

/**
 * Collapse the result of a scoped read or write (a `.returning()` / select array)
 * to its single row, or NOT_FOUND when nothing matched. For a write, zero rows
 * means the `where id and user_id` predicate excluded it - the row is gone or
 * owned by someone else - which is exactly the not-found / not-owned case above.
 * Asserting the affected-row count here is what proves the write was scoped: a
 * cross-user update can neither silently no-op nor touch another user's row.
 *
 * Generic so any owned-table helper (the later versioning / variant tables, owned
 * through a résumé) reuses the same uniform outcome without restating it.
 */
export function assertOne<T>(rows: readonly T[]): T {
  const [row, ...rest] = rows;
  if (row === undefined || rest.length > 0) notFound();
  return row;
}
