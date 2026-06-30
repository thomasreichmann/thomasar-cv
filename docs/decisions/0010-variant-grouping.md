# 0010 - Variant grouping: a base_resume_id self-FK on the thin row

Status: accepted (issue #86)

(The v0.6 milestone text calls this "ADR 0009"; that number went to version
history, so this is the next free one - the same slip ADR 0009 itself noted.)

## Context

v0.6 is variants: maintain multiple named, independently-editable résumés, each
grouped under the base it was forked from and optionally targeting a company or
role. ADR 0001 chose the document model precisely so this would be cheap - "a
variant is another row pointing at its own document, fully independent" - and
deferred the variant table to "a separate issue." This is that issue. It settles
the grouping shape so the fork (#87), grouping/target (#88), and dashboard (#89)
work builds on a fixed schema instead of re-deciding it three times.

The givens: the thin `resume` row (ADR 0001) owns identity, ownership, a `name`
label, and a `{content, theme}` pair (ADR 0006); `ownedResumes` scopes every
access by `user_id` (issue #5); guest conversion reassigns a guest's rows by
rewriting `user_id` (ADR 0005); and `resume_version` already sits beside `resume`
as the *history* axis (ADR 0009). Variants are the orthogonal axis - independent
documents, not snapshots - and that difference drives every choice below.

## Decision

A variant reuses the `resume` row. Forking copies the source's `{content, theme}`
into a new `resume` row under the same owner; the new row is a full, independent
document from birth (ADR 0001's "fully independent"). Two additive, nullable
columns on `resume` carry the grouping and the target.

### `base_resume_id` - a nullable self-FK grouping variants under a base

- `base_resume_id` uuid, nullable, FK to `resume.id`, **on delete set null**.
- A **base** résumé has `base_resume_id` null. A **variant** points it at the id
  of the base it belongs to. "Is this a variant?" is exactly "is this column
  non-null?"; "what are B's variants?" is `base_resume_id = B.id`.

#### Grouping is one level deep

Forking a base B creates a variant with `base_resume_id = B.id`. Forking a
*variant* V (whose `base_resume_id` is B.id) creates another variant under **B**,
not under V: the new row's `base_resume_id = V.base_resume_id ?? V.id`. So the
structure is always exactly two tiers - bases at the root, variants as leaves -
never a chain of variants-of-variants. This matches how the feature is used (a
base résumé, and tailored cuts of it) and keeps the dashboard grouping a flat
"base + its variants," not a tree to render or a recursion to bound. #87
implements that resolution; it is decided here.

#### Deleting a base orphans its variants - `set null`, not cascade

This is the load-bearing contrast with `resume_version`, and it follows directly
from "independent once created" (the v1 variants goal). A version *is part of* a
résumé's history, so it cascades: delete the résumé and its snapshots go too
(ADR 0009). A variant is *not part of* its base - it copied the content at fork
time and has since diverged into the user's own tailored document. Deleting the
base must therefore not delete the variants. `on delete set null` makes a
base-delete **orphan** its variants: their `base_resume_id` goes null, so each
becomes an independent top-level base in its own right - ungrouped, but intact.
Cascade would destroy work the user deliberately forked to keep; that is the one
outcome the "independent" promise forbids.

### `target` - a nullable label for who the variant is for

- `target` text, nullable. The optional company or role a variant is tailored
  for, e.g. `Acme - Staff Engineer`.

One free-text column, not two (`company` + `role`) and not a structured object.
v0.6 only displays and edits the target as a label (#88/#89); splitting it buys
nothing yet, and a structured shape is the kind of abstraction the project defers
until a reader needs it. It is conceptually variant-only - a base leaves it null
- but it lives on every row as a plain nullable column rather than forcing a
separate table, keeping the row thin (ADR 0001). Null means "no target," on a
base or an untargeted variant alike.

### It rides through guest reassignment for free

ADR 0005's conversion is one statement: `update resume set user_id = :new where
user_id = :anon`. It moves whole rows and rewrites only `user_id`; it never
touches `base_resume_id`, and a row's `id` does not change. Because a base and
all its variants share one owner - fork stamps the new row with the session user,
and grouping never crosses accounts - the whole group moves in that single
update, and every variant's `base_resume_id` still points at its base's unchanged
id. The grouping survives conversion with no new code: the additive column simply
travels with the row, and there is nothing to remap. (A variant could only point
cross-account if forking set a base owned by someone else, which it never does;
the pointer and its target always share an owner.)

### No index on `base_resume_id`

`resume_version` is indexed by `resume_id` because its first reader lists one
résumé's history - a keyed scan (ADR 0009). Variant grouping has no such scan:
`ownedResumes.list()` already fetches *all* of a user's résumés in one
`user_id`-scoped query, and the dashboard groups that handful in memory by
`base_resume_id`. There is no per-base lookup to index, so none is added; the
existing `resume_user_id_idx` covers the only query.

## Scope / what this defers

Per the seam-first habit (ADR 0006/0009): this ADR adds the two **drizzle
columns** to `resume`, but **not the migration**. Nothing reads or writes them
yet - the fork procedure (#87) is their first reader, so the additive migration
lands with it (and, per CLAUDE.md, is applied to the shared DB before that PR
opens). Adding the migration now would be schema with no reader; deciding the
shape now is what lets #87/#88/#89 build without re-litigating it.

Out of scope here, by issue:

- the fork procedure that copies content+theme and sets `base_resume_id` (#87),
- grouping reads and the target read/write procedures (#88),
- the dashboard's grouped display, switching, and fork/target UI (#89),
- merging or syncing variants - a v1 non-goal, unchanged here.

## Consequences

- `resume` gains two nullable columns; every existing row reads back as an
  ungrouped, untargeted base (both null), so the change is invisible to current
  data and code. The migration is deferred to #87.
- The whole variant axis is two columns on the existing row plus one ownership
  boundary reused unchanged - no new table, no `user_id` to denormalize, and
  `ownedResumes` reaches a variant exactly as it reaches any résumé.
- Bases and variants are indistinguishable to everything except code that reads
  `base_resume_id`: a variant is a first-class résumé that can be listed, edited,
  themed, versioned (its own `resume_version` rows), exported, and deleted with no
  special path.
- Deleting a base never destroys a variant; it only ungroups it. The "independent
  once created" guarantee is enforced by the FK action itself, not by procedure
  code that could forget it.
