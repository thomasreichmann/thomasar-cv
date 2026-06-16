# roadmap

direction, not commitment. the sequence and scope below will shift as we learn (especially from v0.1 foundation and the v0.2 rendering bet). revise freely.

- milestones are versioned (`v0.1` up to `v1.0` = launch).
- a milestone is created on github only when we groom that sprint, so it never sits empty. the goal + definition-of-done go in the milestone description.
- sequenced by risk: validate the riskiest, most-deferred decision (faithful preview + real text layer) before building on top of it.
- the full task backlog gets broken into issues per sprint at grooming time, not up front.

## arc

- **v0.1 foundation** - deployed app, email + password auth, résumé schema persisted with per-user isolation. (current; see milestone `v0.1`)
- **v0.2 rendering + pdf** - render a seeded résumé to a faithful single-page a4 with a real, selectable text layer in single-column order. no editor yet. proves the core premise end to end and settles the pdf-engine decision.
- **v0.3 editor + api** - résumé crud, content editing per section type, reorder + show/hide, live preview reusing the v0.2 engine.
- **v0.4 polish + interop** - theme controls (density, spacing, scale, accent), json resume import/export.
- **v0.5 versioning ux** - labeled snapshots, named variants, compare two versions, restore.
- **v1.0 launch hardening** - password reset / email verification, supabase rls, final polish.

## not in any version (v1 non-goals)

ai writing, scoring, cover letters, variant merge, freeform layout, collaboration, theme registry, multi-language as a usable feature (seam only).
