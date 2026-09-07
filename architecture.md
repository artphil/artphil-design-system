# Architecture decisions

A record of the design system's structural decisions. Each entry keeps the
context that motivated it, the decision itself and what it costs — so that a
choice never has to be rediscovered from the code.

Open debts: [`.claude/debts.md`](.claude/debts.md).
Evolution specs: [`.claude/specs.md`](.claude/specs.md).

---

## ADR-001 — Brand colors as per-theme pairs

**Date:** 2026-09-07 · **Status:** accepted · **Baseline:** v1.4.0

### Context

Up to v1.4.0 every intent color had a single value, and the text on top of it
came from `--ap-color-text-contrast`, which follows the theme (light text in
the light theme, dark text in the dark one). The effect was that a button's
legibility depended on the page's theme rather than on the button's own color:
`.ap-primary.ap-filled` scored 8.05:1 in the dark theme and **2.21:1** in the
light one. Five of the seven intents failed WCAG AA in the light theme.

Darkening the colors looks like the fix, but it runs into a hard limit. The
same intent color is used in two opposite ways:

- as the **background** of `.ap-filled`, it must contrast with the text;
- as the **text/border** of `.ap-outlined`, it must contrast with the surface.

To carry light text at AA, the color's relative luminance must be ≤ 0.175. To
stand out against the dark theme's surface, it must be ≥ 0.236. The ranges do
not overlap: **no single value satisfies both**.

### Decision

Each brand color gets one value per theme, and the token components consume is
a dynamic alias pointing at the right half of the pair:

```css
/* tokens/colors.css */
:root {
  --ap-color-primary-light: #007a55; /* light theme */
  --ap-color-primary-dark: #00c389; /* dark theme  */

  --ap-color-primary: var(--ap-color-primary-light);
}

/* theme/dark.css */
[data-theme="dark"] {
  --ap-color-primary: var(--ap-color-primary-dark);
}
```

With the intent color dark in the light theme and light in the dark one,
`--ap-color-text-contrast` becomes the correct token for button text again.
The library's original design was right; what was missing was a light-theme
value dark enough to hold it up.

**Direct consequence:** `components/button.css` does not need to know which
theme it is in. No component does.

### Suffix convention

`-light` and `-dark` name **the theme the value belongs to**, not the color's
own lightness. `--ap-color-primary-light` is the dark green used in the light
theme.

The convention is not new: `--ap-color-divider-light` was already
`rgba(0, 0, 0, 0.22)` — a dark color, for the light theme. SPEC-09 proposes
the same shape.

### Alternatives rejected

**Darken the colors and pin the text to a light value.** Fixes `.ap-filled` in
both themes, but drops `.ap-outlined` in the dark theme from ~7:1 to ~2:1, and
pulls the filled background close to the dark surface (~2.8:1, under the 3:1
WCAG 1.4.11 asks for component boundaries).

**Compensate inside the component.** Lightening the color through `color-mix`
under `[data-theme="dark"] .ap-outlined` works, and it is a single rule. It was
rejected for putting theme knowledge inside a component, and for duplicating —
in the wrong layer — the mechanism SPEC-09 already planned for the token layer.

**One text token per intent** (`--ap-color-on-primary`). Fixes `filled`, but
says nothing about `outlined`, which is the tighter of the two constraints.

### Consequences

**Overriding a brand color means supplying the pair.** Overriding only
`--ap-color-primary` in a project's `:root` still works in the light theme, but
**not** in the dark one: the `[data-theme="dark"]` rule has specificity (0,1,1)
against `:root`'s (0,1,0), and wins. The correct consumption pattern is now:

```css
:root {
  --ap-color-primary-light: var(--roast-deep);
  --ap-color-primary-dark: var(--roast-light);
}
```

**Every intent color follows the contract.** The pairing was first applied to
`primary`, `secondary` and `accent`, then extended to `success`, `error`,
`warning`, `info` and `muted` — a single value for those was capped at
**3.89:1** by the same conflict described above, short of AA for body-sized
text. With the pair, the worst case across the whole palette is 4.88:1.

**Three swatches per brand color in the docs.** The documentation page now
lists `primary`, `primary-light` and `primary-dark`. That is informative — the
dynamic alias changes when the theme is toggled, the other two do not.

---

## ADR-002 — A disabled control carries its own colors, not opacity

**Date:** 2026-09-07 · **Status:** accepted · **Baseline:** v1.4.0

### Context

`.ap-button:disabled` combined muted colors with `opacity: 0.6`. Opacity
composites the background _and_ the label against the surface, which pulls both
toward it and collapses the distance between them. The published pair
(`#666666` background, `#999999` label) measures 2.02:1 on its own — and only
**1.42:1** once the opacity is applied.

The ceiling is structural: at 60% opacity, even pure black text on a pure white
background lands at 5.90:1 in the light theme. Any pair that still _looks_
disabled stays close to 2:1. Lowering the opacity to 0.9 was not enough either —
a plain disabled button still measured 4.15:1.

### Decision

Drop `opacity` from the disabled state and let the muted colors do the work.
`--ap-color-muted` becomes an ordinary intent color with a per-theme pair
(ADR-001), and the label comes from the muted text token, except on a filled
button — where the muted color _is_ the background:

```css
.ap-button:disabled {
  --ap-btn-bg: var(--ap-color-muted);
  --ap-btn-text: var(--ap-color-text-muted);

  cursor: not-allowed;
}

.ap-button.ap-filled:disabled {
  --ap-btn-text: var(--ap-color-text-contrast);
}
```

Disabled now reads between 5.09:1 and 8.61:1 depending on variant and theme.

### Consequences

**The disabled affordance is carried by hue, not by fading.** A grey button
next to a colored one, plus `cursor: not-allowed`, is what signals the state.

**WCAG exempts disabled controls** from contrast minimums (1.4.3, "incidental:
inactive user interface components"), so none of this was a compliance failure.
It was a legibility one: at 1.42:1 the label was effectively unreadable.

**`--ap-color-text-muted` got its meaning back.** It had been serving as "label
of a disabled button"; it now means secondary text on a surface, and meets AA
in that role (5.09:1 light, 5.88:1 dark).

---

## ADR-003 — Explicit entry points, and a reset the consumer opts into

**Date:** 2026-09-07 · **Status:** accepted · **Baseline:** v1.4.0 ·
**Breaking**

### Context

The package had no `exports` field, so every file in it was reachable and
nothing was contractual: a consumer deep-importing `components/button.css` was
relying on a path that happened to exist. There was no `sideEffects` field
either.

More importantly, `index.css` pulled in `base/reset.css`. That reset is not
scoped to the design system — it zeroes margins on every element, strips
markers from every list and underlines from every link in the host
application. A project that wanted the tokens got an opinion about its own
markup along with them.

### Decision

Declare the entry points, and take the reset out of the default import.

```json
"exports": {
  ".": "./index.css",
  "./tokens": "./tokens/index.css",
  "./tokens/*.css": "./tokens/*.css",
  "./base/*.css": "./base/*.css",
  ...
},
"sideEffects": ["*.css"]
```

Each layer is reachable as a folder (its `index.css`) or as an individual
file. `main` and `style` stay for tools that do not read `exports`.

The reset now needs an explicit import:

```js
import "artphil-design-system/base/reset.css";
import "artphil-design-system";
```

### On `sideEffects`

The reflex value for this field is `false`, and it would be wrong here. It
tells a bundler that a module can be dropped when nothing imports a binding
from it — which is every CSS file, since CSS exports no bindings. Declaring
`["*.css"]` says the opposite: importing these files _is_ the point.

### Consequences

**This is breaking, in two ways.** An app that relied on the bundled reset
loses it silently — nothing errors, the layout just shifts. And `exports`
closes off paths that used to resolve by accident; anything outside the four
layers now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Both warrant a major
version.

**The documentation page is now a consumer like any other.** It opts into the
reset explicitly, which doubles as the usage example.

**Components stand on their own.** They do not rely on the reset:
`components/typography.css` sets its own `margin: 0`, and `.ap-button` sets
its own padding, border and font.

---

## ADR-004 — Every file declares its own cascade layer

**Date:** 2026-09-07 · **Status:** accepted · **Baseline:** v2.0.0 ·
**Breaking**

### Context

The cascade was decided by declaration order inside a file. `.ap-button` and
`.ap-filled` both scored (0,1,0), so the filled background won only because it
appeared later in `components/button.css`. Reordering the file — or splitting
it — would have changed rendering with nothing to signal it.

The consuming side had the mirror problem. A project overriding a button had to
outbid the library on specificity; `specs.md` records exactly that friction,
with the Café BH project escalating to `.ap-button.<class>:hover` and
`filter: none` to undo a hover.

### Decision

`@layer tokens, base, theme, components`, with the order fixed in `index.css`,
and **each file wrapping its own content in its layer** rather than the entry
point assigning layers through `@import ... layer()`.

The difference matters for deep imports: a consumer importing
`artphil-design-system/components/button.css` on its own still lands in the
`components` layer. Had the assignment
lived in the entry point, that file would arrive unlayered — and unlayered
styles beat layered ones, so a partial import would silently outrank the rest
of the system.

### The reset had to move with it

This is the trap that shaped the decision. Unlayered normal declarations take
precedence over layered ones, whatever the specificity. Leaving
`base/reset.css` outside a layer while components sat inside one would have let
`* { padding: 0 }` — specificity (0,0,0) — beat `.ap-button { padding: … }`.
Every button would have lost its padding. The reset is in `@layer base` for
that reason, not for tidiness.

### Consequences

**A consumer no longer needs specificity to win.** Any unlayered rule in the
project beats any rule in the library. That is the intended override path, and
it is now documented in the README.

**Layer order survives import order.** A layer keeps the position of its first
declaration, so importing the reset before or after the entry point yields the
same result: `base` always precedes `components`.

**Baseline moves to 2022.** `@layer` landed in all evergreen browsers in early
2022 — still older than `color-mix()`, which the buttons already require.

---

## ADR-005 — Button modifiers carry the block name

**Date:** 2026-09-07 · **Status:** accepted · **Baseline:** v2.0.0 ·
**Breaking**

### Context

Intent and variant were global class names: `.ap-primary`, `.ap-filled`,
`.ap-error`. Three problems. They applied to any element, so the library was
styling markup it knew nothing about. They were generic enough to collide with
a project's own `.ap-error`. And they did not say what they modified — nothing
in `.ap-filled` connects it to a button.

They were also inconsistent with the rest of the library, where class names are
self-contained (`.ap-heading1`, `.ap-button`).

### Decision

BEM modifiers naming their block:

```html
<button class="ap-button ap-button--primary ap-button--filled">Primary</button>
```

Enforced by stylelint rather than by convention —
`selector-class-pattern` requires `ap-block` or `ap-block--modifier` across
`base/`, `theme/` and `components/`.

### Consequences

**The markup is more verbose.** Three classes where there were three shorter
ones. Accepted: the modifier is now self-describing, and a reader does not have
to know that `.ap-filled` only means something next to `.ap-button`.

**State rules lost a level of specificity**, from `.ap-button.ap-filled:hover`
(0,3,0) to `.ap-button--filled:hover` (0,2,0). Still above the (0,1,0) of the
variant rule it overrides, and ADR-004 removed the reason to inflate
specificity in the first place.

**It surfaced a bug in the token guard.** Its regex for a custom property
declaration, `(--[\w-]+)\s*:`, matched inside the new selectors:
`.ap-button--filled:hover` registered `--filled` as a defined property. A
`var(--filled)` typo would have passed the check. The regex now requires a
declaration to start after `{`, `;` or a line break.
