# API REST

Base: mesma origem do site, prefixo `/api`. JSON UTF-8. Os endpoints públicos não contêm senha, hash, sessão, backups ou dados privados.

## Autenticação

| Método | Caminho             | Uso                                                      |
| ------ | ------------------- | -------------------------------------------------------- |
| POST   | `/api/auth/login`   | `{ "username": "seu-usuario", "password": "sua-senha" }` |
| GET    | `/api/auth/session` | Retorna usuário e token CSRF da sessão autenticada       |
| POST   | `/api/auth/logout`  | Revoga a sessão                                          |

O login recebe `Origin` igual a `APP_ORIGIN`. A resposta define o cookie `bonki_session` com HttpOnly, SameSite=Strict e expiração de oito horas; Secure é aplicado em produção. Não coloque senha no frontend. Sessões são privadas e mantidas na memória: reiniciar encerra sessões, mas não apaga conteúdo nem credenciais.

## Leitura pública

| Método | Caminho             | Resposta                                                                          |
| ------ | ------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/content`      | Snapshot consistente do catálogo, categorias, carrossel, história e configurações |
| GET    | `/api/products`     | `{data: [...], revision}`                                                         |
| GET    | `/api/products/:id` | `{data: produto, revision}`; 404 para ocultos/excluídos                           |
| GET    | `/api/categories`   | Categorias e subcategorias ativas                                                 |
| GET    | `/api/carousel`     | Slides ativos e parâmetros do carrossel                                           |
| GET    | `/api/history`      | Conteúdo institucional e imagem resolvida                                         |
| GET    | `/api/settings`     | Configurações públicas e imagem institucional resolvida                           |

Produtos de categorias/subcategorias desativadas ficam fora da resposta pública. Produtos ativos indisponíveis continuam visíveis, com pedidos bloqueados. Imagens públicas possuem caminho `/uploads/...`; produtos e slides são ordenados pelo campo `order`.

## Administração

Todos os endpoints abaixo exigem cookie válido. Toda escrita exige `Origin: APP_ORIGIN`, `X-CSRF-Token` obtido da sessão e `If-Match` com a revisão atual. Cada gravação retorna `{data, revision}` e ETag. A versão é global para que relações entre coleções sejam protegidas. O painel monta esses headers automaticamente.

| Método | Caminho                        | Uso                                                                                |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------- |
| GET    | `/api/admin/content`           | Snapshot completo, incluindo ocultos e usos de mídia                               |
| POST   | `/api/admin/products`          | Novo produto; o servidor cria o ID                                                 |
| PUT    | `/api/admin/products/:id`      | Substituir os campos de um produto preservando seu ID                              |
| DELETE | `/api/admin/products/:id`      | Excluir produto; mídia é preservada                                                |
| POST   | `/api/admin/carousel`          | Criar slide                                                                        |
| PUT    | `/api/admin/carousel/:id`      | Atualizar slide e posição                                                          |
| DELETE | `/api/admin/carousel/:id`      | Excluir slide                                                                      |
| PUT    | `/api/admin/carousel-settings` | Autoplay, intervalo, transição, indicadores e setas                                |
| POST   | `/api/admin/categories`        | Criar categoria e subcategorias                                                    |
| PUT    | `/api/admin/categories/:id`    | Renomear, reordenar, ativar/desativar                                              |
| DELETE | `/api/admin/categories/:id`    | Excluir somente se não houver produtos associados                                  |
| PUT    | `/api/admin/history`           | Publicar história completa                                                         |
| PUT    | `/api/admin/settings`          | Publicar configurações completas                                                   |
| GET    | `/api/admin/media`             | Metadados e todas as referências de cada imagem                                    |
| POST   | `/api/admin/media/upload`      | multipart/form-data: `image`, `bucket`, `alt`                                      |
| PUT    | `/api/admin/media/:id`         | `{ "alt": "Texto alternativo" }`                                                   |
| PUT    | `/api/admin/media/:id/replace` | `{ "replacementId": "id-da-nova-midia" }`; troca todas as referências atomicamente |
| DELETE | `/api/admin/media/:id`         | Excluir imagem sem referências e arquivar seus bytes privadamente                  |

### Produto

```json
{
  "name": "Nome do produto",
  "description": "Descrição completa",
  "categoryId": "category-1",
  "subcategoryId": "category-1-sub-1",
  "flavor": "Sabor",
  "size": "100g",
  "price": 12.99,
  "imageId": "original-media-1",
  "available": true,
  "featured": true,
  "active": true,
  "order": 1
}
```

Os IDs existentes estão no snapshot administrativo. Em novos produtos, o servidor gera um UUID. Para duplicar, envie os mesmos campos por POST, com outro nome e, preferencialmente, `active: false`. Para ocultar, faça PUT com `active: false`. O painel oferece essas ações diretamente.

### Slide

Campos: `title`, `description`, `layout` (`single` ou `stack`), `imageIds` (1 a 3 IDs existentes), `button` com `text` e `url`, `active`, `order`. Um slide simples usa uma imagem. Destinos: `#/`, `#/historia`, `#/cardapio`, `#/carrinho` ou URL HTTPS sem credenciais.

### Categoria

Campos: `name`, `active`, `order`, `subcategories`. Cada subcategoria tem `id`, `name`, `active`, `order`. IDs de subcategorias permanecem estáveis ao editar; o painel gera UUIDs para novas subcategorias. O servidor bloqueia remover associações usadas por produtos.

### Upload

`bucket`: `products`, `carousel` ou `institutional`. Máximo: 8 MB, uma imagem JPEG/PNG/WebP não animada, até 24 megapixels. O conteúdo é decodificado pelo Sharp; executáveis, SVG e falsos arquivos de imagem são rejeitados. Novos arquivos são redimensionados para até 1800 × 1800, convertidos em WebP com qualidade 88 e recebem UUID no nome. Os originais migrados mantêm seus bytes.

Uma URL de mídia é imutável; substituir uma foto cria outra URL, evitando cache de versões antigas. O texto alternativo é compartilhado por todas as referências daquela imagem. Para textos alternativos diferentes, envie outro arquivo.

## Erros

Resposta: `{ "error": "mensagem em português" }`.

- 400: campos, imagem ou associações inválidas.
- 401: sessão ausente/expirada ou login inválido.
- 403: origem ou token CSRF inválido.
- 404: recurso inexistente.
- 409: revisão antiga, categoria utilizada ou imagem com referências.
- 413: upload acima de 8 MB ou corpo acima do limite.
- 428: revisão ausente em escrita administrativa.
- 429: oito tentativas de login no período de 15 minutos por IP.
- 503: administrador ainda não criado.
- 500: falha interna, registrada no stderr; o cliente não recebe detalhes sensíveis.
