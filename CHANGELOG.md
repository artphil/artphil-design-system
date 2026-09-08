# Changelog

## 2.0.0 — 2026-09-07

A pass over the whole library, driven by a code review and by the friction of
adopting it in a real project. Most of it is contrast: every intent color moved,
and the theme system was rebuilt so a color no longer has to serve two
incompatible jobs. Three components were added, and the entry points became a
contract instead of an accident.

### Migrating from 1.4

**1. Button classes carry the block name.**

```html
<!-- 1.4 -->
<button class="ap-button ap-primary ap-filled">
  <!-- 2.0 -->
  <button class="ap-button ap-button--primary ap-button--filled"></button>
</button>
```

Applies to every intent (`primary`, `secondary`, `accent`, `success`, `error`,
`warning`, `info`) and to both variants (`filled`, `outlined`).

**2. The reset is opt-in.**

```js
import "artphil-design-system/base/reset.css"; // add this if you relied on it
import "artphil-design-system";
```

Nothing errors if you forget — margins and list markers simply come back.

**3. Overriding a brand color needs both halves.**

```css
/* 1.4 */
:root {
  --ap-color-primary: var(--brand);
}

/* 2.0 */
:root {
  --ap-color-primary-light: var(--brand-on-light);
  --ap-color-primary-dark: var(--brand-on-dark);
}
```

Setting only `--ap-color-primary` still works in the light theme, but the dark
theme overrides it: `[data-theme="dark"]` outranks a `:root` declaration.

**4. Check the browser floor.** Chrome/Edge 123, Firefox 120, Safari 17.5.

### Breaking

- Button intent and variant classes renamed to `.ap-button--*`.
- `base/reset.css` no longer loads from the entry point.
- `exports` now declares the public paths; anything outside `tokens/`, `base/`,
  `theme/`, `components/` and `dist/` fails to resolve.
- The default import resolves to `dist/artphil-design-system.css`, a single
  file generated on pack with the `@import` tree flattened.
- `theme/dark.css` became `theme/scheme.css`.
- Every brand and semantic color changed value.
- `.ap-button:disabled` no longer applies `opacity`.
- Baseline moved to 2024 — `light-dark()` sets it.

### Added

- `.ap-card`, with `-media`, `-header`, `-body`, `-footer` and the modifiers
  `--elevated`, `--sunken`, `--divided`.
- `.ap-input`, covering `input`, `select` and `textarea`, with `--error`.
- `.ap-link`, with `--standalone` and `--inherit`.
- Per-theme color pairs (`--ap-color-<name>-light` / `-dark`) for every brand,
  semantic and neutral role.
- `--ap-color-border`, for the boundary of an interactive control, distinct
  from the decorative `--ap-color-divider`.
- `tokens/radius.css`, with `sm`, `lg`, `pill` and `circle` alongside the
  existing default.
- Line-height tokens: `--ap-line-height`, `--ap-line-height-snug`,
  `--ap-line-height-tight`.
- Cascade layers, declared per file in the order `tokens, base, theme,
components`. Project CSS now wins over the library without competing on
  specificity.
- `:focus-visible` rings on button, input and link.
- `npm run check`: prettier, stylelint configured to defend the token layer,
  and a dependency-free guard that resolves every `var()` and verifies the
  contrast contract in both themes. Runs in CI and before publishing.

### Changed

- The theme follows the operating system by default, through `light-dark()` and
  `color-scheme`. `data-theme` is now an explicit override, and it works on any
  element rather than only on the root.
- Text on a disabled button comes from the muted colors instead of a
  translucent layer.
- Typography components read line heights from tokens.
- `--ap-border-radius` moved from `tokens/spacing.css` to `tokens/radius.css`.
  The token name did not change.

### Fixed

- Contrast across the palette. Every intent now clears WCAG AA in both themes,
  as filled background and as outlined text, against all three surfaces — worst
  case 4.87:1. In 1.4, five of seven intents failed in the light theme, the
  worst at 2.21:1.
- Disabled buttons were effectively unreadable at 1.42:1 once opacity
  composited the label against the surface. Now 5.09:1 or better.
- Buttons rendered in the browser's UI font: `font-family` is set, since form
  controls do not inherit it.
- `.ap-outlined` without an intent painted its text in the surface color,
  making it invisible.
- `cursor: not-allowed` never appeared on a disabled button, cancelled by
  `pointer-events: none` in the same rule.
- The reset skipped `::before` and `::after`, which kept `content-box` sizing.
- Dark theme now sets `color-scheme`, so scrollbars and native controls follow
  it.

### Documentation

- `architecture.md` records the decisions behind this release as ADRs 001–009.
- The playground moved to
  [artphil.github.io/artphil-design-system/docs/](https://artphil.github.io/artphil-design-system/docs/)
  and demonstrates only components that exist.
