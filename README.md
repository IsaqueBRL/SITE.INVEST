# Invest Site (Static)

Um site estático de investimentos pronto para publicar no GitHub Pages.

## Estrutura
- `index.html`: página inicial (dashboard simples).
- `pages/`: páginas secundárias (sobre, contato, artigos, dashboard detalhado).
- `components/`: pedaços reutilizáveis (header, footer, cards).
- `css/`: estilos.
- `js/`: lógica de UI, gráficos básicos e serviços (API fake, storage).
- `data/`: dados de exemplo (JSON).
- `assets/`: logos, ícones e imagens.
- `docs/`: documentação do projeto.
- `.github/workflows/pages.yml`: deploy automático no GitHub Pages.

## Como usar
1. Faça o upload desta pasta para um repositório no GitHub (nome sugerido: `invest-site`).
2. Ative o GitHub Pages em **Settings › Pages** usando a branch `main` e a pasta raiz (`/`) ou `/(root)`.
3. (Opcional) Mantenha o **workflow** `pages.yml` para build/checar o site automaticamente.
4. Edite os arquivos em `data/sample/*.json` com seus próprios dados.

## Desenvolvimento local
Basta abrir `index.html` no navegador. Para evitar erros de fetch de componentes, sirva a pasta com um servidor estático (ex.: `python -m http.server`).

---
Licença: MIT
