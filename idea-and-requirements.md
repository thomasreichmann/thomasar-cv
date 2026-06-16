# Résumé-as-Data — Idea & Requirements

*Working title; rename freely. This is a scope outline, not an implementation spec. It fixes **what** the tool must do and the principles behind it, and deliberately leaves **how** to build it open.*

## What it is

A small, personal tool for maintaining a résumé as structured data instead of a hand-formatted document, producing a clean single-page output that reads well to recruiters and parses correctly in applicant tracking systems (ATS). It replaces a brittle word-processor workflow and keeps multiple tailored versions of one résumé under version control.

## Purpose & framing

- Primarily a tool for personal use, built in a stack the author enjoys.
- Free to use; an optional, honest tip jar is acceptable. It is **not** a business and is not designed around monetization, retention, or growth.
- A secondary goal is to serve as a portfolio piece. The quality bar is "something I'm proud to put my name on," and the feature set stays deliberately small.

## Guiding principles

These constrain decisions without dictating mechanism.

- **Content is separate from presentation.** What the résumé says is data; how it looks and the order it appears in are independent concerns. Layout changes must never require editing content, and vice versa.
- **Structure is data, not a side-effect.** Section and item order are explicit, manipulable properties — moving a section is a trivial, reversible action, not manual layout surgery. (This is the specific failure of the current word-processor résumé and the main thing being fixed.)
- **One rendering definition, two outputs.** The on-screen preview and the exported file derive from the same rendering logic, so the preview is faithful to the export.
- **ATS-clean by construction.** Exports have a real, parseable text layer in single-column reading order. Machine-readability is a guaranteed, verifiable property of the output — not something the user has to hope for.
- **Structured editing, not a freeform canvas.** Layout is adjusted through ordering, visibility, and a small set of theme controls — not arbitrary positioning. The constraint is intentional: it preserves clean reading order and keeps the tool simple.
- **Standards live at the edges.** Interoperate with the relevant open standard (JSON Resume) via import/export, but let the internal model own its own shape so the tool isn't limited by an external schema's gaps.
- **Minimalism is the feature.** The tool deliberately omits the bloat common to résumé builders. Doing less, cleanly, is the point.

## Requirements

### Content & editing
- Represent a résumé as distinct, structured section types (summary, experience, education, skills, projects, and a generic custom section), each containing ordered items.
- Support fields the author actually needs that common standards lack — e.g. a short company/context descriptor line, a remote/availability note, and ongoing roles ("Present").
- Editing content is independent of adjusting layout.

### Layout & ordering
- Reorder sections, and reorder items within a section, as simple reversible operations.
- Show/hide individual sections and items without deleting them (for tailoring).
- Adjust overall presentation through a small, bounded set of theme controls (e.g. density, spacing, scale, accent) — not freeform.
- Ship at least one clean, single-page, ATS-safe template; the design should not preclude additional templates later.

### Rendering & export
- Live preview that reflects edits.
- Export to PDF (the primary deliverable) and to the open standard's format.
- Exported PDF must contain a selectable/parseable text layer and preserve single-column reading order.

### Versioning & variants
The mental model is git-like; the required capabilities are:
- **History** — snapshot the résumé at points in time with a label (covers "I'm adding a new job").
- **Variants** — maintain multiple named, independently-editable versions of one résumé, each optionally targeting a company or role (covers "tailor this for company X").
- **Compare & restore** — view what differs between two versions, and restore a previous one.
- Variants are independent once created. Merging changes between them is out of scope for v1 (see non-goals).

### Internationalization (designed-for, gated off)
- The i18n *feature* is deferred; v1 ships single-language.
- The model must be built so it can be enabled later without a rewrite: a résumé's structure (which entries exist, their order, dates) is shared across languages, and only human-readable prose varies per language. Rendering reads translatable text through an indirection that can later resolve per-locale, so turning the feature on is additive rather than structural.

### Accounts & data
- Users authenticate; each user's résumés are private to them, with ownership enforced on every access.

## Non-goals (v1)

Explicitly out of scope, to protect focus:
- AI writing assistance, bullet generation, or rewriting.
- Résumé "scoring," keyword grading, or suggestion engines.
- Cover-letter or other document generation.
- Merge / conflict resolution between variants.
- Freeform drag-anywhere layout.
- Multi-user collaboration, sharing, or teams.
- Publishing into or depending on any external theme registry or ecosystem.
- Multiple languages as a usable feature (seam only — see above).

## Fixed constraints

- Stack (given): Next.js 16, tRPC v11, Drizzle on Supabase (Postgres), BetterAuth, Tailwind, on Vercel; pnpm + Turborepo monorepo; tested with Vitest + Playwright.
- Output target: a single-page A4 résumé by default.

## Deliberately deferred decisions

Recorded so it's clear these are open — to be chosen during implementation to fit the code, not pre-committed here:
- How the document is persisted (single serialized document vs. normalized records) — should follow whatever keeps versioning clean.
- The exact PDF-generation mechanism — any approach satisfying "faithful to preview + real text layer" is acceptable; tradeoffs to weigh include fidelity, hosting/runtime cost, and operational complexity.
- The precise internal data shapes, module boundaries, and API surface.
- Where and how ownership/authorization is enforced, provided the isolation requirement holds.
