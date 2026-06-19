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

One component needs a manual edit after `add`: `sonner`. The stock version reads
the theme from next-themes, which we do not use. After adding or re-adding it,
drop the `useTheme`/next-themes import and hardcode `theme="dark"` (see the
current `components/ui/sonner.tsx`), then remove next-themes if the CLI
reinstalled it. Nothing else in the set has this problem.

## Conventions

- Components go in `apps/web/components/ui`, one file per component.
- Import the class helper as `import { cn } from "@/lib/cn"`.
- Follow the existing files: function declarations, the main export first,
  helpers below, `data-slot` attributes preserved.
- Tokens, not raw colors. A component should reference `bg-card`, `text-primary`,
  `border-input`, and so on, never a hex value. The palette is the default
  shadcn dark theme today; a deliberate visual identity is a later, separate
  decision (#34) applied as a token swap, so components must not hard-code colors.
- The résumé paper and exported PDF are not chrome. They stay light and are
  themed in `@thomasar-cv/render`, never from these tokens.
