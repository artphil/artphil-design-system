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

**Semantic colors stay outside this contract.** `success`, `error`, `warning`
and `info` keep a single value, tuned to the balance point between the two
themes — which imposes the **3.89:1** ceiling derived from the conflict
described above. That meets AA for large text and UI components (3:1), but not
the 4.5 required for body-sized text. It is a deliberate debt, tracked as item
1b in `debts.md`; the way out is extending this ADR to all four.

**Three swatches per brand color in the docs.** The documentation page now
lists `primary`, `primary-light` and `primary-dark`. That is informative — the
dynamic alias changes when the theme is toggled, the other two do not.
