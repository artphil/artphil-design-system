# artphil-design-system

Design System padrão para meus projetos.

## Instalação

```sh
npm install artphil-design-system
```

## Uso

```js
import "artphil-design-system";
```

O entrypoint (`index.css`) carrega, nesta ordem: `tokens`, `base` (reset),
`theme` e `components`.

## Tema

O tema claro é o padrão. O escuro é ativado pelo atributo `data-theme` — em
geral no `<html>`:

```html
<html data-theme="dark"></html>
```

## Tokens

Todos os tokens usam o prefixo `--ap-`.

### Cores

Base: `--ap-color-primary`, `--ap-color-secondary`, `--ap-color-accent`,
`--ap-color-success`, `--ap-color-error`, `--ap-color-warning`,
`--ap-color-info`, `--ap-color-muted`, `--ap-color-text-muted`.

Escalas neutras: `--ap-color-white-light|medium|dark`,
`--ap-color-black-light|medium|dark`,
`--ap-color-divider-light|dark`.

Dinâmicos (mudam com o tema): `--ap-color-surface`,
`--ap-color-surface-elevated`, `--ap-color-surface-sunken`,
`--ap-color-text`, `--ap-color-text-contrast`, `--ap-color-divider`.

### Espaçamento

`--ap-spacing-xs` (4px), `-sm` (8px), `-md` (16px), `-lg` (24px), `-xl` (32px)
e `--ap-border-radius` (8px).

### Tipografia

`--ap-font-family`, `--ap-font-weight-normal|bold` e a escala
`--ap-font-size-xs|sm|md|lg|xl`, derivada de `--ap-font-size-md` (16px).

## Componentes

### Tipografia

`.ap-heading1`, `.ap-heading2`, `.ap-heading3`, `.ap-lead`, `.ap-body`,
`.ap-note`, `.ap-caption`, `.ap-kicker`.

### Botão

Combine `.ap-button` com uma intenção e uma variante:

```html
<button class="ap-button ap-primary ap-filled">Primary</button>
<button class="ap-button ap-accent ap-outlined">Accent</button>
```

- Intenções: `.ap-primary`, `.ap-secondary`, `.ap-accent`, `.ap-success`,
  `.ap-error`, `.ap-warning`, `.ap-info`
- Variantes: `.ap-filled`, `.ap-outlined`

## Documentação

A página de exemplos vive em [`docs/`](docs/index.html).

## Licença

MIT
