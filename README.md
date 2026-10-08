# Bonki Confeitaria — Site e CMS

Aplicação funcional em HTML, CSS e JavaScript, com backend Node.js/Express e painel administrativo em `/admin`. Preserva a identidade visual e o conteúdo do projeto original: **11 produtos, 13 fotografias, três slides e a história/linha do tempo existentes**.

O CMS publica produtos, categorias, fotografias, carrossel, história, textos da página inicial e configurações sem editar código. Pedidos continuam sendo organizados no carrinho e finalizados pelo WhatsApp.

## Instalar e iniciar

Requisito: Node.js **22.13 ou superior**, com npm. Extraia toda a pasta e abra um terminal dentro de `bonki-cms`.

```sh
npm ci
```

Copie `.env.example` para `.env` — pelo explorador de arquivos, ou com `cp .env.example .env` no Linux/macOS e `Copy-Item .env.example .env` no PowerShell.

Crie seu usuário administrador. O comando solicita usuário e senha; a senha precisa ter ao menos 12 caracteres e não é exibida no terminal.

```sh
npm run setup:admin
npm start
```

- Site: `http://localhost:3000`
- Painel: `http://localhost:3000/admin`

Use o endereço acima exatamente como está definido em `APP_ORIGIN`. Não abra apenas o HTML por duplo clique ou Live Server: agora o site depende das APIs do backend. Para outra porta/domínio, ajuste `PORT` e `APP_ORIGIN` juntos.

## Recursos do painel

- Dashboard com contagens reais de produtos, disponibilidade, destaques, slides e fotografias.
- Produtos: cadastrar, editar, duplicar, ocultar, excluir, buscar, filtrar e ordenar.
- Categorias/subcategorias: IDs estáveis, criação, edição, ordem e ativação.
- Carrossel: slides, fotografias simples/empilhadas, botões, posição, autoplay, intervalo, transição, indicadores e setas.
- Biblioteca: upload efetivo, miniaturas, metadados, alt text, referências, substituição compartilhada e exclusão de imagens sem uso.
- História: fotografia, títulos, parágrafos e acontecimentos com controles de ordem.
- Página inicial: destaques, seção institucional, fotografia e chamada para WhatsApp.
- Configurações: identidade, contato, rodapé, SEO, avisos e modelos de mensagem.
- Prévia dos formulários antes de salvar. **Salvar e publicar** torna os dados disponíveis imediatamente pela API. Um site já aberto atualiza ao retornar à aba e sempre antes de enviar um pedido.

A foto das fundadoras não existia no arquivo original. Os textos de preenchimento da história foram preservados e podem ser substituídos pelo painel.

## Organização do projeto

```text
bonki-cms/
  frontend/              Site público e estilos originais
    index.html
    assets/css/           Base, layout, componentes e páginas
    assets/js/            Renderizadores, carrinho, mensagens e serviço de conteúdo
  admin/                  Área administrativa protegida
    login.html
    index.html
    login-assets/         Tela de login pública
    css/
    js/components/        Campos, biblioteca de imagens e prévias
    js/pages/             Um módulo por área administrativa
    js/services/          Chamadas de API autenticadas
  backend/
    app.js                Composição da aplicação
    server.js             Inicialização e bloqueio de processo único
    routes/               Endpoints
    controllers/          Entrada e saída HTTP
    services/             Autenticação, conteúdo e mídia
    validators/           Validação dos documentos
    repositories/         Persistência e gravações atômicas
    middleware/           Erros e respostas seguras
  data/content.json       Conteúdo inicial completo em seis coleções/documentos
  uploads/                Arquivos originais e novos uploads
  private/                Gerado ao configurar/usar: hash, backups e mídias arquivadas
  scripts/                Configuração de administrador e verificação do projeto
  tests/                  Testes de API, DOM e roteiro Playwright
  docs/                   API, migração, manutenção, produção e relatório de testes
  .env.example
  package.json
  package-lock.json
```

Um único `content.json` contém produtos, categorias, carrossel, história, configurações e metadados de mídia. Essa escolha permite atualizar referências relacionadas em uma transação de arquivo. O JSON é privado no servidor; o público recebe uma projeção filtrada pela API.

## Manutenção

Leia primeiro [o guia para o estagiário](docs/MANUTENCAO.md). O código usa módulos por responsabilidade, nomes claros, formatação consistente e comentários para decisões que merecem explicação. O frontend existente foi adaptado; não há framework de frontend, banco ou serviço externo obrigatório.

```sh
npm run check
npm test
npm run format
```

`check` verifica sintaxe, imports e caminhos. `npm test` executa testes reais de API e DOM em armazenamento temporário, sem modificar o catálogo entregue. As credenciais existentes nos testes são exclusivas das instalações temporárias criadas pelo teste; não configuram o projeto real.

Para executar testes em navegador, em um ambiente que permita instalar Chromium:

```sh
npx playwright install chromium
npm run test:browser
```

Veja [o relatório de testes](docs/TESTES.md) para resultados e limitações da validação realizada nesta entrega.

## Dados e segurança

- Senha com hash scrypt em `private/auth.json`, fora das rotas públicas. Não há usuário/senha padrão.
- Sessão com cookie HttpOnly, SameSite=Strict e Secure em produção, CSRF e validação de origem.
- Limite de tentativas de login; sessão de oito horas e logout.
- Validação no servidor; texto puro escapado no frontend; imagens decodificadas e reprocessadas.
- Uploads JPEG/PNG/WebP de até 8 MB; arquivos novos usam nomes UUID e caminhos gerados pelo servidor.
- Controle de concorrência por revisão, fila de escrita, processo único e gravação atômica.
- Backup antes de cada alteração. Imagens excluídas são arquivadas privadamente para recuperação.
- Carrinho no localStorage dos visitantes; conteúdo administrativo persistido no servidor.
- Catálogo atualizado antes do WhatsApp: alterações de preço exigem revisão do cliente; itens removidos/indisponíveis precisam ser ajustados.

## Publicar

Use uma hospedagem Node.js com armazenamento persistente e HTTPS. Esta versão funciona com uma instância de servidor por armazenamento. Disco efêmero, hospedagem estática e funções serverless exigem outra estratégia de persistência.

Leia [as instruções de produção](docs/PRODUCAO.md), incluindo volumes, backup, recuperação e a evolução para banco e armazenamento de objetos. Não publique a raiz inteira como site estático; o próprio backend serve somente os diretórios apropriados.

## Documentação

- [API REST](docs/API.md)
- [Manutenção para o estagiário](docs/MANUTENCAO.md)
- [Migração do conteúdo original](docs/MIGRACAO.md)
- [Produção e recuperação](docs/PRODUCAO.md)
- [Resultados de testes](docs/TESTES.md)
