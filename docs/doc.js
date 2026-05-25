const DS_PREFIX = "--ap-";

/* Fluxo principal */

// Executa depois que o CSS carregar
window.addEventListener("load", renderComponents);

/* Funções */

function renderComponents() {
  renderColors();
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
}

/* Funções auxiliares */

function renderColors() {
  const ignore = [DS_PREFIX + "color-surface"];
  const container = document.getElementById("colors-grid");
  const colors = getCSSVariables(DS_PREFIX + "color");

  container.innerHTML = "";

  colors.forEach(({ name, value }) => {
    if (isIgnoredToken(name, ignore)) return;
    const card = createColorCard(name, value);
    container.appendChild(card);
  });
}

function isIgnoredToken(token, ignoreList) {
  for (const ignore of ignoreList) {
    if (token.startsWith(ignore)) return true;
  }
  return false;
}

function getCSSVariables(prefix) {
  const styles = getComputedStyle(document.documentElement);
  const vars = [];

  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];

    if (name.startsWith(prefix)) {
      const value = styles.getPropertyValue(name).trim();
      vars.push({ name, value });
    }
  }

  return vars;
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
