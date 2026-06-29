# 0009 - Résumé version history and structural diff: immutable snapshots beside the live row

Status: accepted (issue #80)

(Issue #81 predates the numbering and refers to "ADR 0008"; that number went to
anonymous-data-ttl, so this is the next free number. The version table it
describes is the one decided here.)

## Context

ADR 0001 chose a document model precisely so the git-like features the
requirements ask for - snapshot a résumé with a label, diff two versions, restore
an old one - would be cheap, and then deferred the actual tables: "the version /
variant / history tables are a separate issue." v0.5 is that issue. This ADR
settles two things so the snapshot, restore, and diff issues (#81, #83, and their
UI) build on a fixed shape instead of re-deciding it three times:

1. **How history is stored.** What a saved version is, what it captures, how it
   is owned, and what restore does to the live row.
2. **How two versions are compared.** A diff that is meaningful at the level a
   reader cares about (which section moved, which bullet changed), not a raw JSON
   delta, and that the compare view and a tRPC query can both call.

The shape of the content document (ADR 0001) and the sibling theme column
(ADR 0006) are the givens: every section and item carries a stable app-generated
`id`, the header is a singleton with no id, and the id-less ordered lists - the
header's `contacts` and an item's `bullets` / `skills` / `details`, set apart from
the id-bearing `sections` and their `items` - are plain arrays. The diff design
follows from exactly what does and does not carry an id.

## Decision

Two coupled decisions, taken together so #81/#83 build on one fixed shape: how a
saved version is stored, and how two versions are compared.

### Storage: an immutable `resume_version` table, the live row stays the working copy

A résumé's history is a set of immutable snapshot rows; the `resume` row itself is
always the live working copy that the editor reads and writes. A version is never
edited in place.

`resume_version` (`packages/db/src/schema/resume-version.ts`), beside `resume`:

- `id` uuid primary key.
- `resume_id` uuid, FK to `resume.id`, **on delete cascade**.
- `label` text **not null** - what this snapshot is.
- `content` jsonb (`$type<ResumeContent>`) - a copy of the résumé content at
  snapshot time.
- `theme` jsonb (`$type<ResumeTheme>`) - a copy of the theme at snapshot time.
- `created_at` timestamptz, default now.

Index `(resume_id, created_at desc, id)` so listing a résumé's history
newest-first (#81's `versions.list`) is a single ordered scan; `id` is the
tiebreaker for snapshots that share a `created_at` (a restore inserts only one row
under `now()`, but the tiebreaker keeps the order total and deterministic
regardless).

Each version stores a **full copy** of `{content, theme}`, not a delta against the
prior version or the live row. Base+delta storage would shrink rows but couples
every snapshot to its neighbours' integrity and turns restore into a replay;
ADR 0001 made a whole-document copy cheap precisely so history could be dumb,
independent snapshots, and at this tool's volume the storage saving is not worth
the coupling.

#### Why these columns and not others

- **No `user_id`.** Ownership derives through `resume_id -> resume.user_id`, the
  single ownership signal ADR 0001 / issue #5 established. A denormalized
  `user_id` would be a second copy of authz state to keep in step; instead a
  version is reached only through its owning résumé (an `ownedVersions` helper
  mirroring `ownedResumes`, joining via the résumé), never directly. The
  `ownedResumes` comment already anticipates this: "the later versioning /
  variant tables, which are owned through a résumé, can follow this same shape."
- **`content` + `theme`, not `name`.** A version captures the résumé's substance
  and look, exactly the pair a snapshot/variant copies (ADR 0006). `name` is the
  live row's identity / variant label, not part of what the résumé *says*;
  renaming is not history, and restore must not change a résumé's name. So `name`
  stays only on `resume`.
- **`created_at` only, no `updated_at`.** A version row is immutable by
  construction - the system only ever inserts or cascade-deletes one, never
  UPDATEs it. Restore (below) writes the *live* row and inserts *new* version
  rows; it never mutates an existing snapshot. There is nothing for an
  `updated_at` to track.

#### Restore is itself reversible

Restoring version V writes V's `{content, theme}` back onto the live `resume`
row - but first auto-snapshots the current live state into a new `resume_version`.
So a restore can always be undone by restoring that safety snapshot. Concretely:

1. Copy the current live `{content, theme}` into a new version, labelled
   descriptively from the *date* of the restore, e.g. `before restore 14 Jun 2026`
   (#82's wording). Keying the label on a date rather than on V's own `label`
   keeps the auto-snapshot self-describing without nesting: undoing a restore
   restores a prior safety snapshot, and a label built from another label would
   compound into `before restore "before restore …"` with colliding quotes. The
   history list still reads as a story, without the UI reconstructing context.
2. Write V's `{content, theme}` onto the live row (its `updated_at` bumps).

Restore therefore creates **exactly one** new version - the safety snapshot of the
pre-restore live state - and creates none for the post-restore state, because the
live row *is* that state. V itself is untouched.

#### Retention: unbounded for v1

History is never auto-pruned in v1. This is a personal tool; the volume is small
and "I can always get any old version back" is the point. This is deliberately
**distinct from the anonymous-data TTL (#68)**, which sweeps abandoned *guests*:
when that sweep deletes a never-converted guest's `user` row, its résumés and then
their versions cascade away down the chain (user -> resume -> resume_version), so
guest history needs no separate TTL and signed-in history is kept forever. A
retention cap, if ever wanted, is a later decision - but a *policy* one that drops
history a user could have restored, not the additive, invisible kind; the
"never silently dropped" guarantee below is what such a cap would trade away.

### Diff: a pure structural diff keyed on what carries an id

`diffResume(a, b)` is a pure function over two `{ content, theme }` documents,
living beside the content schema in the db package so both a tRPC query (#83's
owner-scoped `diff`) and the compare view import the same one. It is
document-in / document-out: the router resolves each side (a version id -> that
version's row, or the current working copy -> the live row) and hands the function
two plain documents; the function knows nothing about ownership, the database, or
which side is "current".

It **requires both sides share a `schemaVersion`** and errors otherwise: across a
deliberate format migration the node shapes differ, so a structural diff is
undefined rather than merely empty. (ADR 0001's `schemaVersion` tags the JSON
shape for exactly this kind of guard.) This guard catches only migrations that
bump the version; it does **not** catch the i18n upgrade, which ADR 0001 makes
additive *without* a bump, so a leaf value can be a bare string on one side and
`{ default, i18n }` on the other while both documents still report
`schemaVersion 1`. v1 ships single-language - every leaf is a string, so this never
arises - and the leaf comparisons below assume strings; making them compare across
both shapes is a follow-up the version guard will not flag when i18n turns on.

#### Four treatments, chosen by what each node carries

The whole diff is these four, applied by recursing the document and picking one at
each level by what the node carries:

1. **Keyed diff** over id-bearing lists - the document's `sections`, and the
   `items` within one section. Each node is tracked by its stable `id`, so the
   diff reports **added** (id only in `b`), **removed** (id only in `a`),
   **edited** (same id, fields differ), and **moved** (same id, different *relative
   order* among the surviving ids). Order is compared as position in the id
   sequence, not as a raw array index, so inserting or removing one node does not
   report its whole tail as moved - the same LCS-style relative-order test
   treatment 2 uses, applied to ids. This is what the stable ids in ADR 0001 were
   *for*.

2. **Positional diff** over id-less ordered lists - the header's `contacts`, and an
   item's `bullets` / `skills` / `details`. These elements carry no id, so their
   identity *is* their value under an equality test, and the compare is an LCS over
   those values reporting **added**, **removed**, and **moved** (a value on both
   sides at a different relative position). There is no **edited**: without an id, a
   one-word change to a bullet is indistinguishable from remove-old + add-new, and
   inferring it would mean the fuzzy string matching we deliberately don't do. Two
   consequences of having no identity but the value:
   - **`contacts` are objects, not strings.** A contact is
     `{ kind, value, url?, label? }`, so the equality the LCS keys on is
     whole-object value-equality; a contact that keeps its `kind`/`value` but
     changes only `url` or `label` reports as removed + added, exactly like a
     reworded bullet. The rule is "no identity beyond the value," not "the value is
     a string."
   - **Duplicate values need a tie-break.** With two identical bullets, LCS
     move-vs-(add+remove) attribution is not unique; the diff pairs equal values
     left-to-right by position and reports the surplus on either side as
     added/removed, so the output is deterministic rather than dependent on which
     equal element the matcher happened to pick.

3. **Field deltas** `{ from, to }` for leaf scalar fields - the theme's four enums,
   and the header's `name` / `availability`. Each changed field reports its old and
   new value. These leaves are mostly `localizedText` (bare strings in v1, per the
   guard above); a plain string field such as a contact's or project's `url` is the
   same delta.

4. **Value-object deltas** for the nested objects that carry neither an id nor a
   list shape - chiefly an item's `dateRange` (`{ start?, end }`, each a
   `yearMonth`). A `dateRange` is diffed field-by-field, so `end` changing from a
   value to `null` (a role becoming "Present") surfaces as the meaningful sub-delta
   it is rather than an opaque object swap, and the same per-field treatment covers
   any later nested value-object. Without this, a date change - one of the
   commonest résumé edits - would fall through the other three treatments entirely.

These compose: an item reported **edited** carries the field deltas, the
value-object deltas, and the positional sub-diffs of *its* lists, so the compare
view shows exactly which bullet of which job, or which end-date, changed - not just
"this job changed". The header is a singleton (no id, so never added/removed/moved)
and is diffed as field deltas plus its `contacts` positional diff - the same
machinery as theme and as item bullets, one mechanism reused across call sites.
Between the four, every node in the document shape is covered by exactly one
treatment.

#### What the diff returns

The vocabulary above fixes the *shape* of the result too, so #83's implementation
and #85's compare view share one type instead of negotiating it later. `ResumeDiff`
mirrors the document: a keyed-diff result per id-bearing list (entries tagged
added / removed / edited / moved, an **edited** entry nesting its own field deltas,
value-object deltas, and positional sub-diffs), a positional-diff result per id-less
list, and field deltas for the singleton header and the theme. An **edited** node
*nests* its sub-changes rather than flattening them, so the view can scope a change
to its job and its bullet. An unchanged pair yields an empty diff - distinct from
the `schemaVersion`-mismatch *error*. Exact field names are #83's to finalize; the
tree shape and the nesting are decided here.

#### Moves are orthogonal to edits, and tracked within a container only

Two rules that fell out of where ids live:

- **Moved and edited are independent axes.** A node that changed both its position
  and its content is reported as *both* moved and edited; neither is collapsed
  into the other, so no real change is hidden.
- **A move is tracked within a single container, never across one.** A node at a
  new relative position within the *same* list is a move; a node id that appears
  under a *different* section in `b` is not - it reads as removed from its old
  section and added to the new one. Item ids are unique document-wide, so
  cross-section tracking would be *possible*, but items rarely cross sections and
  scoping the keyed diff per container keeps it a simple, testable function. "Left
  its container" means gone, not moved, at every level.

## Scope / what this defers

Per the seam-first habit ADR 0006 used for the theme column: this ADR adds the
`resume_version` **drizzle schema and row type** beside `resume`, but **not the
migration**. Nothing reads or writes the table yet - the snapshot procedure (#81)
is its first reader, so the additive migration lands with it (and, per the
CLAUDE.md rule, is applied to the shared DB before that PR opens). Adding the
table now would be storage with no reader; deciding its shape now is what lets the
snapshot, restore, and diff issues build without re-litigating it.

Out of scope here, by issue:

- the snapshot / list / get procedures and the `ownedVersions` helper (#81),
- the `diffResume` implementation and the owner-scoped `diff` query (#83),
- restore as a procedure (#82), the version-history panel (#84), and the
  side-by-side compare view (#85),
- variants (v0.6) - a separate grouping decision (its own ADR) on top of this same
  row shape.

## Consequences

- A new `resume-version.ts` joins `resume.ts` in the db schema package, exporting
  the table and its inferred row type, with the migration deferred to #81.
- Versioning reuses the existing ownership boundary unchanged: routers reach a
  version only through its owning résumé, so authz has one source of truth and no
  new `user_id` to drift.
- The diff is one pure, dependency-free function the router and the compare view
  share, fully unit-testable on plain documents (#83's tests), with behavior fixed
  by the id structure rather than by the caller, and a `ResumeDiff` shape #85 can
  render without re-deriving it.
- Restore can never strand a user: the pre-restore safety snapshot makes every
  restore reversible, and unbounded retention means no version a user might want
  is ever silently dropped.
</content>
</invoke>
