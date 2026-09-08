#!/usr/bin/env node

/**
 * Guard for the token layer. Checks two things that CSS fails at silently:
 *
 *   1. every var() reference points at a custom property defined somewhere —
 *      an unresolvable reference drops the declaration with no error anywhere;
 *   2. the contrast contract recorded in architecture.md (ADR-001, ADR-002)
 *      still holds in both themes.
 *
 * Exits non-zero on a broken contract. Findings on surfaces outside the
 * contract are reported as warnings and do not fail the run.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AA = 4.5;

// WCAG 1.4.11: the boundary of a user interface component is not text and
// answers to 3:1, not 4.5
const AA_NON_TEXT = 3;

// a control can sit on any of these, so the worst one is the one that counts
const SURFACES = ["surface", "surface-elevated", "surface-sunken"];

/* CSS reading */

function cssFiles() {
  const dirs = ["tokens", "base", "theme", "components"];
  const files = [join(ROOT, "index.css")];
  for (const dir of dirs) {
    for (const name of readdirSync(join(ROOT, dir))) {
      if (name.endsWith(".css")) files.push(join(ROOT, dir, name));
    }
  }
  return files;
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Returns the body of the first rule whose selector matches, e.g. ":root".
function ruleBody(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  return "";
}

function declarations(body) {
  const out = new Map();
  const declaration = /(?:^|[{;])\s*(--[\w-]+)\s*:\s*([^;]+);/gm;
  for (const [, name, value] of body.matchAll(declaration)) {
    out.set(name, value.trim());
  }
  return out;
}

/* Custom property resolution */

// Splits on the commas that are not inside parentheses.
function splitArguments(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

function resolve(value, map, theme, seen = new Set()) {
  value = value.trim();

  const lightDark = value.match(/^light-dark\(([\s\S]*)\)$/);
  if (lightDark) {
    const [onLight, onDark] = splitArguments(lightDark[1]);
    const picked = theme === "dark" ? onDark : onLight;
    return picked === undefined ? null : resolve(picked, map, theme, seen);
  }

  const reference = value.match(/^var\(([\s\S]*)\)$/);
  if (!reference) return value;

  const [name, ...rest] = splitArguments(reference[1]);
  const fallback = rest.length > 0 ? rest.join(", ") : null;

  if (seen.has(name)) return null; // reference cycle
  seen.add(name);

  if (map.has(name)) return resolve(map.get(name), map, theme, seen);
  return fallback === null ? null : resolve(fallback, map, theme, seen);
}

/* WCAG contrast */

function luminance(hex) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const isHex = (value) => /^#[0-9a-f]{3,8}$/i.test(value ?? "");

/* Checks */

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const sources = cssFiles().map((file) => ({
  file: file.slice(ROOT.length + 1),
  css: stripComments(readFileSync(file, "utf8")),
}));

// 1. every var() reference resolves to a property defined somewhere
const defined = new Set();
for (const { css } of sources) {
  for (const [, name] of css.matchAll(/(?:^|[{;])\s*(--[\w-]+)\s*:/gm)) {
    defined.add(name);
  }
}
for (const { file, css } of sources) {
  for (const [, name] of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!defined.has(name)) fail(`${file}: var(${name}) is never defined`);
  }
}

// 2. theme maps
const tokenCss = sources
  .filter(({ file }) => file.startsWith("tokens/"))
  .map(({ css }) => css)
  .join("\n");
// One declaration map. The theme is not a second set of declarations any
// more: it is which half of light-dark() gets picked while resolving.
const tokens = declarations(ruleBody(tokenCss, ":root"));

const themes = ["light", "dark"];

const read = (theme, name) => {
  const value = tokens.has(name)
    ? resolve(tokens.get(name), tokens, theme)
    : null;
  return isHex(value) ? value : null;
};

// 3. structure: a paired token needs both halves, an alias, and a dark remap
// white/black/divider carry a -light/-dark suffix too, but they are neutral
// scales the themes pick from, not per-theme pairs of one role
const SCALES = ["divider", "white", "black"];

const pairs = [
  ...new Set(
    [...tokens.keys()]
      .filter(
        (n) =>
          n.endsWith("-light") && tokens.has(n.replace(/-light$/, "-dark")),
      )
      .map((n) => n.replace(/^--ap-color-/, "").replace(/-light$/, "")),
  ),
].filter((n) => !SCALES.includes(n));

// paired like the rest, but neither is an intent color: text-muted is text on
// a surface, and border is a non-text boundary. Both are checked further down.
const NON_TEXT = ["border"];
const TEXT_ON_SURFACE = ["text-muted"];

const intents = pairs.filter(
  (n) => !NON_TEXT.includes(n) && !TEXT_ON_SURFACE.includes(n),
);

for (const name of pairs) {
  const alias = `--ap-color-${name}`;
  if (!tokens.has(alias)) {
    fail(`tokens/colors.css: ${alias}-light/-dark exist but ${alias} does not`);
    continue;
  }
  // the alias has to actually land on each half, not merely mention them
  for (const theme of themes) {
    const half = read(theme, `${alias}-${theme}`);
    if (half && read(theme, alias) !== half) {
      fail(`tokens/colors.css: ${alias} does not resolve to ${alias}-${theme}`);
    }
  }
}

// 4. the contrast contract
function worstSurface(theme, color) {
  return SURFACES.map((name) => [name, read(theme, `--ap-color-${name}`)])
    .filter(([, value]) => value)
    .map(([name, value]) => [name, contrast(color, value)])
    .reduce((worst, current) => (current[1] < worst[1] ? current : worst));
}

const rows = [];
for (const name of intents) {
  const row = { name };
  for (const theme of themes) {
    const color = read(theme, `--ap-color-${name}`);
    const onColor = read(theme, "--ap-color-text-contrast");
    if (!color || !onColor) {
      fail(`tokens: --ap-color-${name} does not resolve to a color (${theme})`);
      continue;
    }

    const filled = contrast(color, onColor);
    const [surfaceName, outlined] = worstSurface(theme, color);
    row[theme] = { filled, outlined };

    if (filled < AA) {
      fail(
        `${theme}: --ap-color-${name} as a filled background is ` +
          `${filled.toFixed(2)}:1 against --ap-color-text-contrast ` +
          `(needs ${AA})`,
      );
    }
    if (outlined < AA) {
      fail(
        `${theme}: --ap-color-${name} as outlined text is ` +
          `${outlined.toFixed(2)}:1 on --ap-color-${surfaceName} ` +
          `(needs ${AA})`,
      );
    }
  }
  rows.push(row);
}

// 4b. non-text tokens — a boundary only has to be perceivable
const boundaries = [];
for (const name of NON_TEXT) {
  const entry = { name };
  for (const theme of themes) {
    const color = read(theme, `--ap-color-${name}`);
    if (!color) {
      fail(`tokens: --ap-color-${name} does not resolve to a color (${theme})`);
      continue;
    }

    const [surfaceName, ratio] = worstSurface(theme, color);
    entry[theme] = { surfaceName, ratio };

    if (ratio < AA_NON_TEXT) {
      fail(
        `${theme}: --ap-color-${name} is ${ratio.toFixed(2)}:1 on ` +
          `--ap-color-${surfaceName} (needs ${AA_NON_TEXT})`,
      );
    }
  }
  boundaries.push(entry);
}

// 5. text tokens against the surface they sit on
for (const theme of themes) {
  const surface = read(theme, "--ap-color-surface");
  const onSurface = ["text", ...TEXT_ON_SURFACE];
  for (const token of onSurface.map((n) => `--ap-color-${n}`)) {
    const color = read(theme, token);
    if (!color || !surface) continue;
    const ratio = contrast(color, surface);
    if (ratio < AA) {
      fail(
        `${theme}: ${token} is ${ratio.toFixed(2)}:1 against ` +
          `--ap-color-surface (needs ${AA})`,
      );
    }
  }
}

/* Report */

const pad = (s, n) => String(s).padEnd(n);
const num = (v) => v.toFixed(2).padStart(5);

console.log(`\n  ${pad("intent", 12)}${pad("filled", 18)}outlined`);
console.log(`  ${pad("", 12)}${pad("light   dark", 18)}light   dark`);
for (const row of rows) {
  if (!row.light || !row.dark) continue;
  console.log(
    `  ${pad(row.name, 12)}${num(row.light.filled)}  ${num(row.dark.filled)}` +
      `       ${num(row.light.outlined)}  ${num(row.dark.outlined)}`,
  );
}

console.log(`\n  ${pad("boundary", 12)}worst surface (needs ${AA_NON_TEXT})`);
for (const entry of boundaries) {
  if (!entry.light || !entry.dark) continue;
  console.log(
    `  ${pad(entry.name, 12)}${num(entry.light.ratio)}  ${num(entry.dark.ratio)}`,
  );
}

for (const message of warnings) console.log(`\n  warning  ${message}`);
for (const message of errors) console.log(`\n  error    ${message}`);

console.log(
  `\n  ${defined.size} custom properties, ${pairs.length} theme pairs, ` +
    `${errors.length} errors, ${warnings.length} warnings\n`,
);

process.exit(errors.length > 0 ? 1 : 0);
