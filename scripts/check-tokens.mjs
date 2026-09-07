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

function resolve(value, map, seen = new Set()) {
  const match = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (!match) return value;

  const [, name, fallback] = match;
  if (seen.has(name)) return null; // reference cycle
  seen.add(name);

  if (map.has(name)) return resolve(map.get(name), map, seen);
  return fallback ? resolve(fallback.trim(), map, seen) : null;
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
const darkCss = sources.find(({ file }) => file === "theme/dark.css").css;

const light = declarations(ruleBody(tokenCss, ":root"));
const dark = new Map([
  ...light,
  ...declarations(ruleBody(darkCss, '[data-theme="dark"]')),
]);

const themes = [
  ["light", light],
  ["dark", dark],
];

const read = (map, name) => {
  const value = map.has(name) ? resolve(map.get(name), map) : null;
  return isHex(value) ? value : null;
};

// 3. structure: a paired token needs both halves, an alias, and a dark remap
// white/black/divider carry a -light/-dark suffix too, but they are neutral
// scales the themes pick from, not per-theme pairs of one role
const SCALES = ["divider", "white", "black"];

const pairs = [
  ...new Set(
    [...light.keys()]
      .filter(
        (n) => n.endsWith("-light") && light.has(n.replace(/-light$/, "-dark")),
      )
      .map((n) => n.replace(/^--ap-color-/, "").replace(/-light$/, "")),
  ),
].filter((n) => !SCALES.includes(n));

// text-muted is paired like the rest, but it is text on a surface rather than
// an intent color, so it is checked against the surface only (see below)
const intents = pairs.filter((n) => n !== "text-muted");

const darkOverrides = declarations(ruleBody(darkCss, '[data-theme="dark"]'));
for (const name of pairs) {
  const alias = `--ap-color-${name}`;
  if (!light.has(alias)) {
    fail(`tokens/colors.css: ${alias}-light/-dark exist but ${alias} does not`);
  }
  if (!darkOverrides.has(alias)) {
    fail(`theme/dark.css: ${alias} is not remapped to ${alias}-dark`);
  }
}

// 4. the contrast contract
const rows = [];
for (const name of intents) {
  const row = { name };
  for (const [theme, map] of themes) {
    const color = read(map, `--ap-color-${name}`);
    const onColor = read(map, "--ap-color-text-contrast");
    const surface = read(map, "--ap-color-surface");
    if (!color || !onColor || !surface) {
      fail(`tokens: --ap-color-${name} does not resolve to a color (${theme})`);
      continue;
    }

    const filled = contrast(color, onColor);
    const outlined = contrast(color, surface);
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
          `${outlined.toFixed(2)}:1 against --ap-color-surface (needs ${AA})`,
      );
    }

    // outside the contract: the other two surfaces a control can sit on
    for (const surfaceName of ["surface-elevated", "surface-sunken"]) {
      const alt = read(map, `--ap-color-${surfaceName}`);
      if (!alt) continue;
      const ratio = contrast(color, alt);
      if (ratio < AA) {
        warn(
          `${theme}: --ap-color-${name} as outlined text is ` +
            `${ratio.toFixed(2)}:1 on --ap-color-${surfaceName}`,
        );
      }
    }
  }
  rows.push(row);
}

// 5. text tokens against the surface they sit on
for (const [theme, map] of themes) {
  const surface = read(map, "--ap-color-surface");
  for (const token of ["--ap-color-text", "--ap-color-text-muted"]) {
    const color = read(map, token);
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

for (const message of warnings) console.log(`\n  warning  ${message}`);
for (const message of errors) console.log(`\n  error    ${message}`);

console.log(
  `\n  ${defined.size} custom properties, ${pairs.length} theme pairs, ` +
    `${errors.length} errors, ${warnings.length} warnings\n`,
);

process.exit(errors.length > 0 ? 1 : 0);
