# 0003 - Frontend foundation: shadcn/ui on Base UI, default shadcn dark theme

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
in one way: a single dark theme, keeping the stance set in #25.

A note on #25, since it is easy to misread. Issue #25 scoped exactly three
things: dark-only chrome, dark tokens defined once, and the resume paper / PDF
staying light. Its implementation (#28) went further and shipped a bespoke
"gallery wall" aesthetic, a warm-graphite palette with a brass accent, a
three-font system (Fraunces / Hanken Grotesk / JetBrains Mono), plus grain and
spotlight treatments. That look was an implementation choice, not a ratified
product identity, and it was never decided as the project's visual direction.
This foundation does not adopt it as the baseline. Baking it in would canonize a
look chosen by accident and propagate it into every component built on top. The
foundation takes the default shadcn dark look instead; a deliberate bespoke
identity is a separate, later decision (see Consequences).

There were three honest ways to get accessible components:

- Vendor shadcn/ui (Base UI primitives, copied into the repo, styled with
  Tailwind). Velocity and accessibility, code we own, matches nexus.
- Use the headless primitives directly and write every styled wrapper by hand.
  More control per component, much more code to own and keep accessible.
- Hand-roll everything. Maximum minimalism, but re-implements focus traps, ARIA,
  and keyboard behavior ourselves, which is the classic footgun.

## Decision

Adopt shadcn/ui, mirroring nexus's specifics, on the default shadcn dark theme.
Dark-only is the one deliberate deviation from nexus.

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
  `--radius`) through Tailwind v4 `@theme inline`, at shadcn's default token
  values in their dark variant (the default base color and primary, as nexus
  uses). No bespoke palette, no bespoke font system. Components resolve against
  these tokens, so the values behind them can be swapped later without touching
  component code.
- **Visual baseline.** The default shadcn dark look. The foundation replaces
  #28's ad-hoc gallery-wall `--color-*` tokens, three-font wiring, grain, and
  spotlight with the shadcn semantic tokens and a default font (Geist, as nexus).
  The chrome #28 styled (landing, auth, dashboard, preview surround) is
  re-pointed at the vendored components and the default tokens. #25's dark-only
  stance and light paper are preserved; its specific gallery-wall styling is not.
- **Dark-only.** Deliberately deviate from nexus here. No `next-themes`, no theme
  toggle, no light variant, no system-preference handling, keeping #25's stance.
  shadcn / Base UI components ship with `dark:` variants baked in; the foundation
  resolves them to their dark values once (the app is permanently dark) rather
  than carrying a switchable `.dark` scope. The resume paper and exported PDF stay
  light and are themed separately from these chrome tokens (see ADR 0002 and
  `@thomasar-cv/render`); chrome tokens never reach the paper.

## Deviations from nexus, made explicit

- nexus is light + dark with `next-themes` and a toggle; this project is dark-only.

That is the only deviation. Everything else (component source, primitive library,
variant and `cn` patterns, icon / toast / form libraries, component conventions,
the default base color, and the default font) follows nexus.

## Why not the alternatives

- Hand-rolling primitives re-implements accessibility we would then have to test
  and defend on every component; it trades a one-time setup for permanent risk.
- Using Base UI directly without the shadcn scaffolding throws away styled
  starting points nexus has already shaped, for no gain we need.
- Leaving styling ad hoc per page means the editor forks its own button / input /
  dialog look, which is exactly the throwaway-styling outcome this grooming
  exists to prevent.
- Keeping #28's gallery-wall palette as the baseline would canonize a look that
  was never deliberately chosen and bake it into every editor component built on
  the foundation. The default shadcn look is cheaper to stand up, more malleable,
  and leaves a real visual-identity decision to be made on its own, deliberately,
  when wanted, rather than inherited by accident.

## Consequences

- The v0.3 foundation build issue (created by #27, see #31) sets up
  `components.json`, `lib/cn.ts`, the shadcn semantic tokens at their default dark
  values, the dark-only reconciliation, and a starter set of vendored components,
  then re-points the existing auth / preview chrome at them. #28's gallery-wall
  tokens, fonts, grain, and spotlight are removed in that work.
- That foundation issue is the gate into v0.3: the editor issues groomed later
  depend on it, so they build on the component system rather than ad hoc styling.
- A deliberate bespoke visual identity (palette, type, accent) is a separate,
  deferred decision, tracked in its own issue and recorded in a later ADR when
  made. Because the foundation routes everything through the semantic token
  layer, that change is a token swap, not a component rewrite.
- `@thomasar-cv/render` and the PDF export are untouched. The paper is a light,
  ATS-parsed document and is not themed from chrome tokens.
- Resume-output theme controls (density, spacing, scale, accent) remain v0.4 and
  are out of scope here.
