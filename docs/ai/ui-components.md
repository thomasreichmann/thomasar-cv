# Adding UI components

The app's component foundation is shadcn/ui vendored on Base UI primitives, set
up in issue #31 per [ADR 0003](../decisions/0003-frontend-foundation.md). Read
the ADR for the why; this file is the how.

The components live in `apps/web/components/ui`, are owned in-repo, and resolve
against the shadcn semantic tokens defined once in `apps/web/app/globals.css`.
The app is permanently dark (no next-themes, no toggle, no light variant).

## Add a component

Run from `apps/web` so the CLI finds `components.json`:

```bash
cd apps/web
pnpm dlx shadcn@latest add <component> --yes
```

Then format it, because the CLI emits its own style (no semicolons) and the repo
uses Prettier:

```bash
cd ../..
pnpm exec prettier --write apps/web/components/ui/<component>.tsx
```

Confirm it still compiles:

```bash
pnpm --filter web typecheck
```

That is the whole loop. The CLI reads `components.json`, writes the component to
`components/ui`, wires the `@/lib/cn` import, and installs any missing Base UI
package. It does not touch `globals.css` or existing components.

## Why `style: "base-vega"`

`components.json` sets `"style": "base-vega"`. In the shadcn CLI the `style`
field now selects both the primitive library and the look: `base-*` codenames
are Base UI, `radix-*` are Radix. `vega` is the classic shadcn look (the legacy
`new-york` style resolves to `radix-vega`), so `base-vega` is "new-york on Base
UI", which is what ADR 0003 specifies and what every vendored component already
uses.

Do not switch `style` to a `radix-*` value. That pulls Radix-based components
that import `@radix-ui/*` instead of `@base-ui/react`, which do not match the
rest of `components/ui` and drag in a second primitive library.

## Keep it dark-only

shadcn / Base UI components ship `dark:` utilities for their dark appearance.
`globals.css` defines `@custom-variant dark (&)`, so those utilities always
apply and components resolve to their dark values once, against the dark tokens.
A newly added component works as-is; you do not add a `.dark` class, a theme
provider, or next-themes. If the CLI ever offers to rewrite `globals.css` with a
light/dark split, decline it.

Two components need a manual edit after `add`:

- `sonner`. The stock version reads the theme from next-themes, which we do not
  use. After adding or re-adding it, drop the `useTheme`/next-themes import and
  hardcode `theme="dark"` (see the current `components/ui/sonner.tsx`), then
  remove next-themes if the CLI reinstalled it.
- `dropdown-menu`. The Positioner carries an added `disableAnchorTracking` prop.
  Base UI tracks layout shifts of the trigger while the menu is open, so a menu
  whose own item-select handler grows content above the trigger (e.g. the editor
  "Add section" menu appending a section) makes the still-fading popup teleport
  down to follow the trigger. The prop disables that tracking; scroll and
  window-resize repositioning are unaffected. Re-apply it after re-adding.

Nothing else in the set has this problem.

## Conventions

- Components go in `apps/web/components/ui`, one file per component.
- Import the class helper as `import { cn } from "@/lib/cn"`.
- Follow the existing files: function declarations, the main export first,
  helpers below, `data-slot` attributes preserved.
- Tokens, not raw colors. A component should reference `bg-card`, `text-primary`,
  `border-input`, and so on, never a hex value. The palette is the Oxide identity
  ([ADR 0004](../decisions/0004-visual-identity.md)): warm-graphite chrome with a
  burnt-rust accent, Bricolage Grotesque sans and Geist Mono labels. It is a swap
  of the token values in `globals.css`, so components must not hard-code colors or
  they will not follow it.
- The résumé paper and exported PDF are not chrome. They stay light and are
  themed in `@thomasar-cv/render`, never from these tokens.
