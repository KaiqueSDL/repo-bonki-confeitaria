# Guia de manutenção para o estagiário

## Comece pelo fluxo

1. O cliente abre `frontend/index.html`.
2. `frontend/assets/js/services/content.js` lê `/api/content`.
3. As páginas em `frontend/assets/js/pages/` recebem esse conteúdo e montam a interface existente.
4. O painel utiliza formulários em `admin/js/pages/` para enviar alterações pela API.
5. O backend valida os campos e grava o snapshot em `data/content.json`.

Não precisa alterar código para administrar o catálogo. Use `/admin`.

## Onde mexer

| Quero alterar…                                | Arquivo / pasta                      |
| --------------------------------------------- | ------------------------------------ |
| Cores e tipografia do site                    | `frontend/assets/css/base.css`       |
| Menu lateral e rodapé                         | `frontend/assets/css/layout.css`     |
| Aparência dos cards e modal                   | `frontend/assets/css/components.css` |
| Layout de cada página pública                 | `frontend/assets/css/pages/`         |
| Estrutura dos destaques/carrossel             | `frontend/assets/js/pages/home.js`   |
| Busca e filtros por IDs                       | `frontend/assets/js/pages/menu.js`   |
| Carrinho e atualização antes do WhatsApp      | `frontend/assets/js/cart.js`         |
| Modelos das mensagens                         | Painel → Configurações do site       |
| Aparência do painel                           | `admin/css/admin.css`                |
| Formulário de um produto                      | `admin/js/pages/products.js`         |
| Outros formulários                            | `admin/js/pages/`                    |
| Componentes de formulário, upload e mensagens | `admin/js/components/forms.js`       |
| Chamadas autenticadas da API                  | `admin/js/services/api.js`           |
| URLs da API                                   | `backend/routes/api.js`              |
| Entrada/saída das requisições                 | `backend/controllers/content.js`     |
| Regras de conteúdo e referências              | `backend/services/content.js`        |
| Regras e processamento de imagens             | `backend/services/media.js`          |
| Regras dos campos aceitos                     | `backend/validators/content.js`      |
| Gravação, backups e concorrência              | `backend/repositories/content.js`    |
| Sessões e verificação de senha                | `backend/services/auth.js`           |

## Nomes herdados do site

`pHome`, `pHist`, `pMenu` e `pCart` continuam sendo os renderizadores das quatro páginas. `CONFIG` e `PRODUCTS` são adaptadores dos dados recebidos da API; não são o repositório. `$` seleciona um elemento e `$$` seleciona vários, como `querySelector` e `querySelectorAll`. `escapeHTML` converte texto em conteúdo seguro para os templates.

As classes `inline-style-*` preservam valores que antes estavam nos atributos HTML. Estão agrupadas no final de `components.css`; não representam dados de conteúdo.

## Acrescentar um campo editável

Exemplo: adicionar uma informação de conservação do produto.

1. Inclua o campo no estado inicial dos produtos em `data/content.json` em um ambiente de desenvolvimento. Não altere dados de produção manualmente durante execução.
2. Acrescente a validação em `backend/validators/content.js`, na função `product`.
3. Inclua o input e a leitura no formulário em `admin/js/pages/products.js`.
4. Mostre o campo no componente público em `frontend/assets/js/components.js`, usando `escapeHTML`.
5. Atualize a documentação da API e adicione um teste que salve e leia o campo.
6. Rode `npm run check`, `npm test` e `npm run format`.

Não envie HTML como conteúdo editável. O CMS usa texto puro para reduzir o risco de XSS.

## Entenda os IDs

Produtos, categorias, subcategorias, slides e imagens usam IDs estáveis. Renomear um registro não altera seu ID. Produtos usam `categoryId` e `subcategoryId`; imagens usam `imageId` ou `imageIds`. Não associe registros por nome ou pela posição no array.

Se excluir/desativar um produto, o carrinho antigo mostra que ele está indisponível e oferece remoção. Ele não passa a apontar para outro produto.

## Gravação e concorrência

Existe um único snapshot para que produtos, categorias e mídia possam ser atualizados em conjunto. Cada escrita recebe `If-Match` e produz uma revisão nova. Se outra operação já alterou o conteúdo, o servidor responde 409. Não remova essa verificação para esconder o erro; recarregue os dados e reaplique a edição.

A fila do repositório serializa escritas dentro do processo. `server.lock` impede duas instâncias usando o mesmo armazenamento. A gravação usa arquivo temporário, fsync e rename. A revisão anterior vai para `private/backups/` antes da gravação.

O backend e o painel estão organizados sem framework de frontend. Os scripts públicos continuam clássicos com `defer`, na ordem de dependência do HTML. O painel e o backend usam módulos ES com imports explícitos. Não adicione `async` aos scripts públicos nem converta apenas um deles em módulo sem ajustar seus contratos.

