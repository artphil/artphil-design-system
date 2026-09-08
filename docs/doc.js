const DS_PREFIX = "--ap-";
const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

const TYPOGRAPHY_ORDER = ["xl", "lg", "md", "sm", "xs"];

const COLOR_ORDER = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "error",
  "info",
  "muted",
  "border",
];

// dynamic aliases: already represented by the base colors
const IGNORED_COLORS = [
  "color-surface",
  "color-surface-elevated",
  "color-surface-sunken",
  "color-text",
  "color-text-contrast",
  "color-divider",
];

const COLOR_CARD = {
  card: "ap-card ap-card--elevated color-card",
  preview: "ap-card-media color-preview",
  info: "ap-card-body ap-note",
  labelPrefix: DS_PREFIX + "color-",
  decorate: (el, value) => {
    el.style.background = value;
  },
};

const TYPOGRAPHY_CARD = {
  card: "ap-card ap-card--elevated ap-card--divided typography-card",
  preview: "ap-card-body",
  info: "ap-card-footer ap-note",
  labelPrefix: DS_PREFIX + "font-size-",
  decorate: (el, value) => {
    el.style.fontSize = value;
    el.textContent = SAMPLE_TEXT;
  },
};

/* Main flow */

// runs once the stylesheets have loaded
window.addEventListener("load", renderComponents);

/* Functions */

function renderComponents() {
  renderTokens("colors-grid", "color", COLOR_ORDER, COLOR_CARD, IGNORED_COLORS);
  renderTokens(
    "typography-grid",
    "font-size",
    TYPOGRAPHY_ORDER,
    TYPOGRAPHY_CARD,
  );
}

function toggleTheme() {
  const html = document.documentElement;
  // with no attribute set, the theme in effect is the system one
  const current =
    html.getAttribute("data-theme") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  html.setAttribute("data-theme", current === "dark" ? "light" : "dark");

  // the swatch values are resolved per theme
  renderComponents();
}

/* Helpers */

function renderTokens(containerId, group, order, spec, ignore = []) {
  const container = document.getElementById(containerId);
  const tokens = getCSSVariables(DS_PREFIX + group, order);

  container.innerHTML = "";

  for (const { name, value } of tokens) {
    if (isIgnoredToken(name, ignore)) continue;
    container.appendChild(createTokenCard(name, value, spec));
  }
}

function isIgnoredToken(token, ignoreList) {
  return ignoreList.some((ignore) => token === DS_PREFIX + ignore);
}

function getCSSVariables(prefix, order = null) {
  const styles = getComputedStyle(document.documentElement);
  const vars = [];

  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];
    if (!name.startsWith(prefix)) continue;

    let value = styles.getPropertyValue(name).trim();
    if (value.includes("calc(")) {
      value = resolveThroughProbe("fontSize", value);
    } else if (value.includes("light-dark(")) {
      value = toHex(resolveThroughProbe("color", value));
    }

    vars.push({ name, value });
  }

  return sortCSSVariables(vars, prefix, order);
}

function sortCSSVariables(vars, prefix, order) {
  const keyPrefix = prefix + "-";

  return vars.sort((a, b) => {
    const aKey = a.name.replace(keyPrefix, "");
    const bKey = b.name.replace(keyPrefix, "");

    if (order) {
      const aIndex = order.indexOf(aKey);
      const bIndex = order.indexOf(bKey);

      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? Infinity : aIndex) -
          (bIndex === -1 ? Infinity : bIndex)
        );
      }
    }

    return aKey.localeCompare(bKey);
  });
}

// calc() and light-dark() only resolve where the value is used, so the computed
// custom property still carries the whole function. A throwaway element gives
// the browser somewhere to resolve it against the current theme.
function resolveThroughProbe(property, value) {
  const el = document.createElement("div");
  el.style[property] = value;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el)[property];
  document.body.removeChild(el);
  return resolved;
}

// Normalizes a computed color to hex. Anything carrying alpha, and any
// notation other than rgb(), comes back untouched — a hex would either lose
// information or read worse than the original.
function toHex(color) {
  if (!color.startsWith("rgb")) return color;

  // rgba(0, 0, 0, 0.22) and rgb(0 0 0 / 22%) both show up
  const parts = color.match(/-?\d*\.?\d+%?/g);
  if (!parts || parts.length < 3) return color;

  const [r, g, b, a] = parts;
  if ([r, g, b].some((n) => n.endsWith("%"))) return color;

  const alpha =
    a === undefined ? 1 : Number.parseFloat(a) / (a.endsWith("%") ? 100 : 1);
  if (alpha < 1) return color;

  const hex = [r, g, b]
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("");

  return `#${hex}`;
}

function createTokenCard(name, value, spec) {
  const card = document.createElement("div");
  card.className = spec.card;

  const preview = document.createElement("div");
  preview.className = spec.preview;
  spec.decorate(preview, value);

  const info = document.createElement("div");
  info.className = spec.info;
  info.innerHTML = `
      <strong>${name.replace(spec.labelPrefix, "")}</strong><br/>
      ${name}<br/>
      ${value}
    `;

  card.append(preview, info);

  return card;
}
