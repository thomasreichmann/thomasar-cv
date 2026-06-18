# 0003 - Frontend foundation: shadcn/ui on Base UI, gallery-wall tokens, dark-only

Status: accepted (issue #27)

## Context

v0.3 (editor) is the first milestone that builds durable, complex UI: content
editing per section type, reorder, show / hide, live preview. That means forms,
inputs, selects, menus, dialogs, toggles, toasts, and drag-to-reorder, all of
which need accessible interactive primitives. Today there is almost nothing
durable to migrate (a couple of auth forms and the preview surround), so this is
the cheap moment to settle where components come from, how theming is wired, and
what the visual baseline is. Settle it now or the editor gets built on throwaway
per-page styling and we pay to unwind it later.

The author maintains another monorepo, `nexus`, with a mature, in-production
frontend setup on the same stack (Next.js, Tailwind v4, tRPC). Rather than
re-derive these choices, this ADR reuses nexus's proven toolchain and adapts it
to two things this project already decided that nexus did not: a single dark
theme (#25) and a bespoke "gallery wall" visual identity.

There were three honest ways to get accessible components:

- Vendor shadcn/ui (Base UI primitives, copied into the repo, styled with
  Tailwind). Velocity and accessibility, code we own, matches nexus.
- Use the headless primitives directly and write every styled wrapper by hand.
  More control per component, much more code to own and keep accessible.
- Hand-roll everything. Maximum minimalism, but re-implements focus traps, ARIA,
  and keyboard behavior ourselves, which is the classic footgun.

## Decision

Adopt shadcn/ui, mirroring nexus's specifics, on top of this project's existing
dark-only gallery-wall identity rather than shadcn's default look.

- **Component source.** shadcn/ui, `style: "new-york"`, primitives from Base UI
  (`@base-ui/react`), components vendored into `apps/web/components/ui` and owned
  in-repo. Mirror nexus's toolchain: `lucide-react` for icons, `sonner` for
  toasts, `class-variance-authority` for variants, `cn` (`clsx` + `tailwind-merge`)
  at `apps/web/lib/cn.ts`, `tw-animate-css` for animation utilities, and TanStack
  Form for forms. Follow nexus's component conventions (function declarations,
  main export first, helpers below).
- **Theming.** Adopt shadcn's semantic CSS-variable layer (`--background`,
  `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`,
  `--destructive`, `--card`, `--popover`, `--border`, `--input`, `--ring`,
  `--radius`) through Tailwind v4 `@theme inline`, so vendored components resolve
  against tokens instead of hard-coded colors. But the values behind those
  variables stay the gallery-wall palette already in `globals.css` (warm
  near-blacks, parchment ink, the one brass accent) and the three-font system
  (Fraunces / Hanken Grotesk / JetBrains Mono). shadcn's default `neutral`
  base-color and blue primary are NOT adopted.
- **Visual baseline.** The gallery-wall dark aesthetic shipped in #25 is the
  baseline. The foundation formalizes #25's ad-hoc `--color-*` tokens into the
  shadcn semantic layer; it does not replace them. This is what the #27 criterion
  "the dark tokens come from the foundation rather than ad hoc" means in practice,
  now that #25 has already shipped those tokens.
- **Dark-only.** Deliberately deviate from nexus here. No `next-themes`, no theme
  toggle, no light variant, no system-preference handling, keeping #25's stance.
  shadcn / Base UI components ship with `dark:` variants baked in; the foundation
  resolves them to their dark values once (the app is permanently dark) rather
  than carrying a switchable `.dark` scope. The resume paper and exported PDF stay
  light and are themed separately from these chrome tokens (see ADR 0002 and
  `@thomasar-cv/render`); chrome tokens never reach the paper.

## Deviations from nexus, made explicit

- nexus is light + dark with `next-themes` and a toggle; this project is dark-only.
- nexus uses the `neutral` base color and Geist; this project keeps its bespoke
  gallery-wall palette and three-font system. The portfolio identity from #25 is
  worth more here than palette parity with nexus.

Everything else (component source, primitive library, variant and `cn` patterns,
icon / toast / form libraries, component conventions) follows nexus verbatim.

## Why not the alternatives

- Hand-rolling primitives re-implements accessibility we would then have to test
  and defend on every component; it trades a one-time setup for permanent risk.
- Using Base UI directly without the shadcn scaffolding throws away styled
  starting points nexus has already shaped, for no gain we need.
- Leaving styling ad hoc per page means the editor forks its own button / input /
  dialog look, which is exactly the throwaway-styling outcome this grooming
  exists to prevent.

## Consequences

- The v0.3 foundation build issue (created by #27) sets up `components.json`,
  `lib/cn.ts`, the semantic-token mapping over the gallery-wall palette, the
  dark-only reconciliation, and a starter set of vendored components, then
  re-points the existing auth / preview chrome at them.
- That foundation issue is the gate into v0.3: the editor issues groomed later
  depend on it, so they build on the component system rather than ad hoc styling.
- #25's tokens are absorbed by the foundation, not rewritten; the visual result
  is unchanged, the tokens just move into the shadcn-shaped layer.
- `@thomasar-cv/render` and the PDF export are untouched. The paper is a light,
  ATS-parsed document and is not themed from chrome tokens.
- Resume-output theme controls (density, spacing, scale, accent) remain v0.4 and
  are out of scope here.
