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

O entrypoint carrega `tokens`, `theme` e `components`, nesta ordem.

### Camadas

Todo CSS da lib vive em `@layer`, na ordem `tokens, base, theme, components`.
Cada arquivo declara a própria camada, então importar
`artphil-design-system/components/button.css` isolado continua caindo na
camada certa.

Na prática isso significa que **o CSS do seu projeto vence o da lib sem
precisar de especificidade**: estilo fora de camada tem precedência sobre
estilo em camada, qualquer que seja o seletor.

```css
/* vence .ap-button--filled, mesmo sendo um seletor mais fraco */
.meu-botao {
  border-radius: 0;
}
```

### Reset

O reset **não** vem no entrypoint, porque mexe em elementos que são da
aplicação e não do design system: zera margens de tudo, remove marcadores de
lista e sublinhado de links. Quem quiser opta explicitamente:

```js
import "artphil-design-system/base/reset.css";
import "artphil-design-system";
```

### Importar partes isoladas

```js
import "artphil-design-system/tokens"; // só os tokens
import "artphil-design-system/tokens/colors.css"; // só as cores
import "artphil-design-system/components/button.css";
```

Os subpaths disponíveis são `tokens`, `base`, `theme` e `components` — cada um
como pasta (carrega o `index.css` dela) ou arquivo individual.

## Tema

O tema claro é o padrão. O escuro é ativado pelo atributo `data-theme` — em
geral no `<html>`:

```html
<html data-theme="dark"></html>
```

## Tokens

Todos os tokens usam o prefixo `--ap-`.

### Cores

Marca — um valor por tema, com o sufixo nomeando o tema (mesma convenção de
`--ap-color-divider-light`): `--ap-color-primary-light` / `-dark`,
`--ap-color-secondary-light` / `-dark`, `--ap-color-accent-light` / `-dark`.
`--ap-color-primary`, `--ap-color-secondary` e `--ap-color-accent` resolvem
para o par certo conforme o tema ativo.

Semânticas — mesmo par: `--ap-color-success-light` / `-dark`,
`--ap-color-error-light` / `-dark`, `--ap-color-warning-light` / `-dark`,
`--ap-color-info-light` / `-dark`.

Neutras — `--ap-color-muted-light` / `-dark` é a cor de intent de um controle
desabilitado; `--ap-color-text-muted-light` / `-dark` é texto secundário sobre
a superfície.

Todas seguem o mesmo contrato: um alias sem sufixo (`--ap-color-success`, e
assim por diante) resolve para o valor do tema ativo. Ao sobrescrever qualquer
uma delas, forneça **os dois** valores do par — o `-light` precisa ser escuro o
bastante para carregar texto claro, e o `-dark` claro o bastante para carregar
texto escuro. Sobrescrever só o alias não funciona no tema escuro; o porquê
está em [`architecture.md`](architecture.md).

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
<button class="ap-button ap-button--primary ap-button--filled">Primary</button>
<button class="ap-button ap-button--accent ap-button--outlined">Accent</button>
```

- Intenções: `.ap-button--primary`, `--secondary`, `--accent`, `--success`,
  `--error`, `--warning`, `--info`
- Variantes: `.ap-button--filled`, `.ap-button--outlined`

## Documentação

A página de exemplos vive em [`docs/`](docs/index.html). As decisões de
arquitetura estão em [`architecture.md`](architecture.md).

## Desenvolvimento

```sh
npm install
npm run check    # formatação, lint e guard de tokens
npm run format   # aplica o prettier
```

O `check` roda três coisas, e é o que a CI e o `prepublishOnly` executam:

- **`format:check`** — prettier, no padrão que o repositório já seguia;
- **`lint:css`** — stylelint, configurado para defender a arquitetura: cor
  literal e `px` cru são proibidos em `base/`, `theme/` e `components/`, onde
  tudo deve passar por token, e toda custom property precisa do prefixo `ap-`;
- **`check:tokens`** — guard próprio, sem dependências: verifica que toda
  referência `var()` aponta para uma propriedade definida (referência quebrada
  não gera erro nenhum em CSS, a declaração some em silêncio) e que o contrato
  de contraste dos ADRs continua valendo nos dois temas.

## Licença

MIT
