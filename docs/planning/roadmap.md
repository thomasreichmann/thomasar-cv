# roadmap

direction, not commitment. the sequence and scope below will shift as we learn (especially from v0.1 foundation and the v0.2 rendering bet). revise freely.

- milestones are versioned (`v0.1` up to `v1.0` = launch).
- a milestone is created on github only when we groom that sprint, so it never sits empty. the goal + definition-of-done go in the milestone description.
- sequenced by risk: validate the riskiest, most-deferred decision (faithful preview + real text layer) before building on top of it.
- the full task backlog gets broken into issues per sprint at grooming time, not up front.

## arc

- **v0.1 foundation** (done) - deployed app, email + password auth, résumé schema persisted with per-user isolation. ownership is enforced in app code through a single owned-resumes boundary (no postgres rls; that stays deferred to v1.0), and the content document already carries the i18n seam and a `schemaVersion`, so nothing structural is left for later milestones to retrofit.
- **v0.2 rendering + pdf** (current) - settle the pdf-engine decision first (faithful preview + real text layer), then render the seeded résumé to a faithful single-page a4 with a selectable text layer in single-column order. no editor yet; this proves the core premise before anything is built on top. see milestone `v0.2`.
- **v0.3 editor + api** - résumé crud, content editing per section type, reorder + show/hide, live preview reusing the v0.2 engine.
- **v0.4 polish + interop** - theme controls (density, spacing, scale, accent), json resume import/export.
- **v0.5 versioning ux** - labeled snapshots, named variants, compare two versions, restore.
- **v1.0 launch hardening** - password reset / email verification, supabase rls, final polish.

## not in any version (v1 non-goals)

ai writing, scoring, cover letters, variant merge, freeform layout, collaboration, theme registry, multi-language as a usable feature (seam only).
