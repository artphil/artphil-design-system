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
  "surface",
  "text",
  "divider",
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
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
}

/* Funções auxiliares */

function renderColors() {
  const ignore = ["color-surface", "color-text", "color-divider"];
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
  for (const ignore of ignoreList) {
    if (token.startsWith(DS_PREFIX + ignore)) return true;
  }
  return false;
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
  container.style.flexDirection = "column";

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
