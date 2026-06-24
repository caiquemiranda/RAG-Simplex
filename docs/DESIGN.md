# Design System — RAG-Simplex (IBSystems)

Identidade visual da **IBSystems — Intelligent Building**: paleta **ciano → teal**
(verde-água) em gradiente. Tokens centralizados em variáveis CSS → trocar a marca é
mudar um arquivo. Fonte: [`frontend/src/index.css`](../frontend/src/index.css).

## Paleta da marca

| Token | HSL (claro) | ~Hex | Uso |
| --- | --- | --- | --- |
| `--brand` | `184 78% 45%` | `#19C0CC` | ciano (logo, esquerda); gradientes |
| `--brand-2` | `168 46% 42%` | `#3A9C88` | teal (logo, direita); gradientes |
| `--primary` | `175 75% 33%` | `#159086` | botões/links/realce principal |
| `--ring` | `175 75% 33%` | `#159086` | foco |
| `--accent` | `178 44% 92%` | `#E2F4F2` | hover/realces sutis |

Gradiente da marca: `linear-gradient(90deg, hsl(var(--brand)), hsl(var(--brand-2)))`
— usado no logo-texto (`bg-gradient-to-r from-brand to-brand-2 bg-clip-text`).

## Tema claro/escuro

- Implementado com `darkMode: 'class'` (Tailwind) + [`ThemeProvider`](../frontend/src/theme/ThemeContext.tsx).
- A classe `dark` é aplicada no `<html>`; preferência persistida em
  `localStorage["rag-tema"]` (respeita `prefers-color-scheme` na 1ª vez).
- Aplicado **antes do render** em `main.tsx` (evita flash).
- Toggle: menu do usuário na sidebar (“Tema · ☀️ claro / 🌙 escuro”).
- O bloco `.dark { … }` no `index.css` redefine os mesmos tokens com versões para
  fundo escuro (brand mais clara para contraste).

## Logo

- Componente [`Logo.tsx`](../frontend/src/components/Logo.tsx) usa `/logo.png`
  (colocar em [`frontend/public/logo.png`](../frontend/public/README.md)).
- **Fallback automático:** se a imagem não carregar, mostra o texto “IBSystems”
  com o gradiente da marca.
- Onde aparece: sidebar (topo), header mobile e tela de login.

## Como portar / trocar a marca
1. Alterar `--brand`, `--brand-2`, `--primary`, `--ring`, `--accent` em `index.css`
   (claro e `.dark`).
2. Substituir `frontend/public/logo.png`.
3. Nenhuma tela precisa de mudança — todas consomem os tokens.

> Tokens neutros (`background`, `foreground`, `card`, `muted`, `border`) seguem o
> padrão shadcn/ui em HSL. Manter o formato `H S% L%` (sem `hsl()`) — o Tailwind
> envolve com `hsl(var(--token))`.

## Relacionada
[`ARQUITETURA.md`](ARQUITETURA.md) · [`TECNOLOGIAS.md`](TECNOLOGIAS.md)
