const DS_PREFIX = "--ap-";
const TYPOGRAPHY_ORDER = ["xl", "lg", "md", "sm", "xs"];

const COLOR_ORDER = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "error",
  "info",
];

/* Fluxo principal */

// Executa depois que o CSS carregar
window.addEventListener("load", renderComponents);

/* Funções */

function renderComponents() {
  renderColors();
  renderTypography();
}

function toggleTheme() {
  const html = document.documentElement;
  // sem atributo, o tema em vigor é o do sistema
  const current =
    html.getAttribute("data-theme") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

/* Funções auxiliares */

function renderColors() {
  // Aliases dinâmicos: já aparecem representados pelas cores base
  const ignore = [
    "color-surface",
    "color-surface-elevated",
    "color-surface-sunken",
    "color-text",
    "color-text-contrast",
    "color-divider",
  ];
  const container = document.getElementById("colors-grid");
  const colors = getCSSVariables(DS_PREFIX + "color", COLOR_ORDER);

  container.innerHTML = "";

  colors.forEach(({ name, value }) => {
    if (isIgnoredToken(name, ignore)) return;
    const card = createColorCard(name, value);
    container.appendChild(card);
  });
}

function isIgnoredToken(token, ignoreList) {
  return ignoreList.some((ignore) => token === DS_PREFIX + ignore);
}

function getCSSVariables(prefix, order = null) {
  const styles = getComputedStyle(document.documentElement);
  const vars = [];

  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];

    if (name.startsWith(prefix)) {
      let value = styles.getPropertyValue(name).trim();
      if (value.includes("calc(")) {
        value = resolveCalcValue(value);
      } else if (value.includes("light-dark(")) {
        value = resolveColorValue(value);
      }
      vars.push({ name, value });
    }
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

function resolveCalcValue(value) {
  const el = document.createElement("div");
  el.style.fontSize = value;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).fontSize;
  document.body.removeChild(el);
  return resolved;
}

// light-dark() só resolve quando usado numa propriedade de verdade: o valor
// computado da custom property ainda traz a função inteira
function resolveColorValue(value) {
  const el = document.createElement("div");
  el.style.color = value;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  document.body.removeChild(el);
  return rgbToHex(resolved);
}

function rgbToHex(color) {
  const parts = color.match(/\d+/g);
  if (!parts || parts.length < 3) return color;
  const hex = parts
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

function createColorCard(name, value) {
  const card = document.createElement("div");
  card.className = "color-card";

  const preview = document.createElement("div");
  preview.className = "color-preview";
  preview.style.background = value;

  const info = document.createElement("div");
  info.className = "color-info";
  info.innerHTML = `
      <strong>${name.replace(DS_PREFIX + "color-", "")}</strong><br/>
      ${name}<br/>
      ${value}
    `;

  card.appendChild(preview);
  card.appendChild(info);

  return card;
}

function renderTypography() {
  const container = document.getElementById("typography-grid");
  const fonts = getCSSVariables(DS_PREFIX + "font-size", TYPOGRAPHY_ORDER);

  container.innerHTML = "";

  fonts.forEach(({ name, value }) => {
    const card = createTypographyCard(name, value);
    container.appendChild(card);
  });
}

function createTypographyCard(name, value) {
  const card = document.createElement("div");
  card.className = "typography-card";

  const preview = document.createElement("div");
  preview.className = "typography-preview";
  preview.style.fontSize = value;
  preview.textContent = "The quick brown fox jumps over the lazy dog";

  const info = document.createElement("div");
  info.className = "typography-info";
  info.innerHTML = `
      <strong>${name.replace(DS_PREFIX + "font-size-", "")}</strong><br/>
      ${name}<br/>
      ${value}
    `;

  card.appendChild(preview);
  card.appendChild(info);

  return card;
}
