# 0007 - JSON Resume export: field correspondence and the gaps

Status: accepted (issue #54)

## Context

The requirements call for interop with the open standard (JSON Resume) via
import/export, while letting the internal model own its own shape "so the tool
isn't limited by an external schema's gaps". This issue is the export half: map a
`resumeContent` document to a JSON Resume document
(https://jsonresume.org/schema, v1.0.0) and serve it as a downloadable `.json`
for any owned résumé. Import (#55) is the inverse and reuses the same schema and
field correspondence.

Two things have to be settled and recorded:

1. **Where each of our fields lands** in JSON Resume, including the fields the
   standard does not have.
2. **What is deliberately dropped**, so a lossy mapping is a recorded choice
   rather than a silent bug.

## Decision

**One mapping function, `toJsonResume` (in `@thomasar-cv/db/jsonresume`), is the
single content -> JSON Resume correspondence.** It lives beside the content
schema, not in the render package, so it carries no dependency on the PDF
renderer: the export download route uses it, and import (#55) reuses its inverse,
without either pulling in react-pdf. A shared `jsonResume` Zod schema models the
subset we emit and accept; export validates its output against it, and unknown
sections are *stripped* (Zod's default), which is also exactly import's "drop
unknown fields without failing" rule.

The export is the **visible** résumé: hidden sections and items are dropped, the
same way the rendered PDF drops them (ADR 0002's one render definition), so a
tailored-out role never leaks into the file.

### Field correspondence

| Our model | JSON Resume | Notes |
| --- | --- | --- |
| `header.name` | `basics.name` | |
| `header.availability` | `basics.label` | nearest field; see gaps |
| `contact` email / phone / website (first) | `basics.email` / `phone` / `url` | |
| other contacts, and extra email/phone/website | `basics.profiles[]` | nothing dropped; an extra email/phone gets a `mailto:`/`tel:` url so it stays clickable |
| `summary` section items | `basics.summary` | joined, blank-line separated |
| `experience` | `work[]` | |
| &nbsp;&nbsp;`company` / `title` / `location` | `name` / `position` / `location` | |
| &nbsp;&nbsp;`context` | `work.description` | the standard's company descriptor |
| &nbsp;&nbsp;`bullets` | `highlights[]` | |
| `education` | `education[]` | |
| &nbsp;&nbsp;`institution` / `degree` | `institution` / `studyType` | |
| &nbsp;&nbsp;`details` | `courses[]` | |
| `skills` (`category` / `skills`) | `skills[]` (`name` / `keywords[]`) | |
| `projects` | `projects[]` | name, url, description, highlights, dates |
| `dateRange.start` / `end` | `startDate` / `endDate` | partial ISO "YYYY" or "YYYY-MM" |

### The three gaps the issue names

- **Company context line (`experience.context`)** -> `work.description`. JSON
  Resume documents `description` as the company descriptor ("e.g. Social Media
  Company"), which is exactly what our context line is. This is a clean
  nearest-field map, not a loss.
- **Remote / availability (`header.availability`)** -> `basics.label`. JSON
  Resume has no availability field. `label` is the free-text tagline shown under
  the name and is otherwise unused (we model no separate job title), so it is the
  nearest home. Recorded as a deliberate approximation: a reader expecting `label`
  to be a job title will see availability text instead.
- **Ongoing "Present" roles (`dateRange.end: null`)** -> **omit `endDate`**. JSON
  Resume marks an ongoing role by the *absence* of `endDate`, not a sentinel, so a
  null end leaves the field unset.

### Other deliberate losses

- **Education `location`** is dropped: JSON Resume's education item has no
  location field, and none is a sensible substitute.
- **`degree` is not split** into `studyType` + `area`. We model a single degree
  string ("BSc Computer Science"); it goes whole into `studyType`, leaving `area`
  unset, rather than guessing a split.
- **`custom` sections are omitted.** JSON Resume has no freeform section, and the
  section title is localized free text - so routing a custom "Languages" section
  to the standard `languages` array would mean inferring intent from a string. We
  omit rather than guess. This is the one section type our model has that the
  standard cannot hold, and the requirements' premise (the internal model owns its
  shape) is exactly why we keep it instead of contorting the export.

  Lossless preservation *was* available and was deliberately not taken: the
  schema's root `additionalProperties` is open, so a vendor-prefixed container
  (`x-custom`) would be schema-valid. It is skipped because no standard theme
  reads unknown top-level keys, so it would only serve a round-trip importer -
  which is out of scope here (#55). To keep the drop from being *silent*, the
  editor's export control names it when a visible custom section is present.
- **No `meta` block.** `meta` (canonical / version / lastModified) is optional
  tooling metadata, not visible content, so the export emits none. The résumé's
  `updatedAt` lives on the row, *outside* the mapper's document input, so the pure
  mapper has no honest source for `lastModified` (it is not about determinism -
  `updatedAt` is stored, not a clock); the route could add it later if a reader
  needs it. `schemaVersion` is ours and does not map to `meta.version`.

## Out of scope

- **Round-trip fidelity.** Import (#55) is a separate issue; this mapping is not
  required to be losslessly invertible (it isn't - availability, custom sections,
  and the degree split don't round-trip).
- **Variant-aware export** (v0.5). Export covers a single résumé document.

## Consequences

- A new `@thomasar-cv/db/jsonresume` module (schema + `toJsonResume`), and a
  download route `GET /resume/[id]/jsonresume` scoped to the owner through the
  existing `ownedResumes` boundary.
- `resumeFileName` moved from the render package to `@thomasar-cv/db/schema`
  (content-derived, now extension-parameterized) so the JSON route can name the
  download without depending on the PDF renderer.
- The shared `jsonResume` schema is ready for import to reuse: it already models
  the field set and strips the sections we don't map.
