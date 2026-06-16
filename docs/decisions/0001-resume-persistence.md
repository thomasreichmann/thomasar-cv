# 0001 - Résumé persistence: one JSONB document, thin table

Status: accepted (issue #6)

## Context

We need to model a résumé as structured data: the section types (summary,
experience, education, skills, projects, custom), ordered items inside each,
order and visibility as data, plus the fields common standards lack (company /
context line, remote / availability note, ongoing "Present" roles). The
requirements doc deliberately leaves *how* to persist this open, and gives one
tiebreaker: pick whatever keeps versioning clean. Versioning here is git-like -
snapshot the whole résumé with a label, keep independent tailored variants, diff
two versions, restore an old one.

## Decision

Store the entire résumé content as a single validated JSONB document, on a thin
relational table.

- `resume` table (`packages/db/src/schema/resume.ts`): `id`, `user_id` (owner,
  FK to the existing auth `user`), `name` (a human label), `content` (jsonb),
  timestamps. That is the whole row. Ownership and listing are the only things
  we query, so they are the only things that stay relational.
- The content document shape lives in `resume-content.ts` as a Zod schema
  (`resumeContent`). Postgres treats the column as opaque jsonb; the shape is
  owned and validated in app code - every write goes through
  `resumeContent.parse()`. The column is typed with `.$type<ResumeContent>()`.

## Why a document, not normalized rows

A résumé is one page, always read and rendered as a whole, and never queried by
an inner field. So the relational advantages (integrity, partial queries) buy us
little, while the relational costs land squarely on the thing we care about most:

- A history snapshot is a copy of one document, not a copy of rows across
  several tables with rewritten foreign keys.
- A variant is another row pointing at its own document, fully independent.
- Compare is a diff of two JSON documents; restore is writing an old one back.

Normalized rows would make every one of those a multi-table transaction. The
document model makes them nearly free, which is exactly the tiebreaker the
requirements set.

## Shape choices worth recording

- **Order is array position.** In a document the array *is* the order, so "order
  as data" needs no separate integer column. Reordering is reordering the array.
- **Visibility is a `hidden` boolean** on every section and item, so tailoring
  hides nodes instead of deleting them.
- **Stable `id` on every node** (app-generated). Cheap now, and it is what lets
  reorder / diff / restore track a node across edits and versions.
- **i18n seam without a rewrite.** A translatable value is a plain string until
  it needs a second language, then becomes `{ default, i18n }`. `resolveText`
  reads both shapes, so turning i18n on later is additive per value - no schema
  change, no migration. v1 ships single-language, so every value is a string.
- **`schemaVersion` on the document** tags the JSON shape itself (distinct from
  the résumé's own history), so the format can be migrated later deliberately.

## Scope / what this defers

Issue #6 defines the content document and the one `resume` table. The version /
variant / history *tables* are a separate issue. This shape is chosen so those
tables slot on top by referencing a content document, without reshaping content.

## Consequences

- Validation discipline matters: the DB will not catch a malformed document, so
  all writes must go through the Zod schema (this is the natural tRPC input
  boundary).
- Content is not queryable by inner field in SQL. Acceptable: we never need it.
