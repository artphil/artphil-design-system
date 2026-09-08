# artphil-design-system

Design System padrão para meus projetos.

**[▶ Abrir o playground](https://artphil.github.io/artphil-design-system/docs/)**
— tokens, tipografia e componentes renderizados, com alternância de tema.

## Instalação

```sh
npm install artphil-design-system
```

## Uso

```js
import "artphil-design-system";
```

O entrypoint carrega `tokens`, `theme` e `components`, nesta ordem.

O que o import padrão resolve é `dist/artphil-design-system.css`, um arquivo
único gerado no empacotamento com todos os `@import` já resolvidos. Isso
importa para quem carrega a lib por `<link>` ou CDN, sem bundler: a árvore de
fontes tem três níveis de `@import` encadeados, e o navegador só descobre cada
nível depois de baixar e parsear o anterior. A fonte granular continua
acessível em `artphil-design-system/index.css`.

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

O tema segue a preferência do sistema operacional por padrão. O atributo
`data-theme` é o override explícito:

```html
<html data-theme="dark"></html>
<html data-theme="light"></html>
```

Ele funciona em qualquer elemento, não só no `<html>` — `color-scheme` é
herdado, então uma subárvore pode ter tema próprio:

```html
<section data-theme="dark">…</section>
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

`--ap-spacing-xs` (4px), `-sm` (8px), `-md` (16px), `-lg` (24px), `-xl` (32px).

### Raio de borda

`--ap-border-radius` (8px) é o default. A escala completa tem
`--ap-border-radius-sm` (4px), `-lg` (16px), `-pill` (999px) e `-circle`
(50%).

### Tipografia

`--ap-font-family`, `--ap-font-weight-normal|bold` e a escala
`--ap-font-size-xs|sm|md|lg|xl`, derivada de `--ap-font-size-md` (16px).

Entrelinha: `--ap-line-height` (1.5) é o default; `--ap-line-height-snug`
(1.3) e `--ap-line-height-tight` (1.2) são para títulos.

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

### Card

`.ap-card` com as partes `-media`, `-header`, `-body` e `-footer`, todas
opcionais e em qualquer ordem:

```html
<div class="ap-card">
  <div class="ap-card-media"></div>
  <div class="ap-card-header"><h3 class="ap-heading3">Título</h3></div>
  <div class="ap-card-body"><p class="ap-body">Conteúdo</p></div>
  <div class="ap-card-footer"><button class="ap-button">Ação</button></div>
</div>
```

O card não define tipografia. Os níveis de texto vêm das classes semânticas, e
o card controla apenas o espaço entre eles.

- Modificadores: `.ap-card--elevated`, `.ap-card--sunken`, `.ap-card--divided`
- Variáveis: `--ap-card-bg`, `--ap-card-border-color`, `--ap-card-radius`,
  `--ap-card-padding`, `--ap-card-gap`, `--ap-card-media-ratio`,
  `--ap-card-media-bg`

A mídia sangra até a borda, acompanha o raio conforme a posição e recorta
`img`, `svg` e `video` com `object-fit: cover`. O `-body` cresce para ocupar a
sobra, o que alinha os rodapés entre cards de alturas diferentes.

## Suporte de navegador

|               | mínimo |
| ------------- | ------ |
| Chrome / Edge | 123    |
| Firefox       | 120    |
| Safari        | 17.5   |

O requisito é definido por `light-dark()`, usado em todos os tokens dinâmicos
de cor e disponível desde maio de 2024. As demais features modernas da lib têm
suporte mais antigo: `color-mix()` desde 2023 e `@layer` desde o início de 2022.

`light-dark()` não tem comportamento de fallback. Sem suporte, a substituição
de `var(--ap-color-primary)` insere uma função desconhecida na propriedade de
destino, a declaração torna-se inválida em tempo de computação e assume
`unset`, removendo as cores de fundo e de texto dos componentes.

Ao adicionar features de CSS, verificar se o requisito mínimo acima permanece
válido.

## Documentação

O playground fica em
[artphil.github.io/artphil-design-system/docs/](https://artphil.github.io/artphil-design-system/docs/)
e é gerado a partir de [`docs/`](https://github.com/artphil/artphil-design-system/tree/main/docs).
Ele lê os tokens do CSS em tempo de execução, então reflete o estado do
repositório.

As decisões de arquitetura estão em
[`architecture.md`](https://github.com/artphil/artphil-design-system/blob/main/architecture.md).

## Desenvolvimento

```sh
npm install
npm run check    # formatação, lint e guard de tokens
npm run format   # aplica o prettier
npm run build    # gera dist/artphil-design-system.css
```

O `build` roda automaticamente no `prepack`, então o `dist/` não é versionado —
existe apenas no pacote publicado.

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
