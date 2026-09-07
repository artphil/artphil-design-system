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
