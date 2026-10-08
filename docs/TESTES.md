# Relatório de validação

Os testes criam cópias temporárias do catálogo e dos uploads. Nenhum teste modifica o estado inicial entregue nem cria credenciais de produção.

## API e DOM — aprovados

Comando: `npm test`.

**16 testes aprovados, zero falhas, zero testes ignorados.**

| Cenário                                                                    | Resultado               |
| -------------------------------------------------------------------------- | ----------------------- |
| Migração de 11 produtos, 13 imagens, três slides e quatro acontecimentos   | Aprovado                |
| Login, cookie HttpOnly/SameSite, sessão, painel protegido e logout         | Aprovado                |
| Escrita sem sessão, CSRF, origem e esquema inválidos                       | Bloqueadas corretamente |
| Cadastro, destaque, edição, duplicação, ocultação e exclusão de produto    | Aprovado                |
| Categoria renomeada mantém associações; exclusão usada é bloqueada         | Aprovado                |
| Cadastro, ordem e remoção de slides; configurações do carrossel            | Aprovado                |
| História, página inicial e WhatsApp configurável                           | Aprovado                |
| Conteúdo lido por outra instância após gravação em disco                   | Aprovado                |
| Upload efetivo, conversão WebP, arquivo persistido, referências e exclusão | Aprovado                |
| Imagem falsa rejeitada e imagem em uso protegida                           | Aprovado                |
| Substituição compartilhada de mídia em uma transação                       | Aprovado                |
| Escritas com mesma revisão: uma confirmada, outra 409                      | Aprovado                |
| Backups anteriores à gravação e bytes de mídia arquivados                  | Aprovado                |
| Limite de login e hash separado do conteúdo público                        | Aprovado                |
| Formulários administrativos salvam pela API                                | Aprovado                |
| Cards, filtros, modal, navegação, quantidades e mensagens no DOM           | Aprovado                |
| Carrinho preservado após recriação do DOM                                  | Aprovado                |
| Produtos removidos/indisponíveis em carrinhos antigos                      | Aprovado                |
| Preços atuais e revisão do pedido antes do WhatsApp                        | Aprovado                |
| Texto administrável não executa HTML/JavaScript                            | Aprovado                |

## Caminhos e sintaxe

`npm run check` verifica a sintaxe dos arquivos JavaScript, imports relativos, recursos referenciados nos três HTMLs e os arquivos de mídia do estado inicial. Verificação aprovada.

## Navegador

Comando: `npm run test:browser`, com Chromium funcional indicado por `CHROMIUM_PATH` no ambiente de validação.

**Quatro testes em Chromium aprovados, zero falhas. No total: 20 testes automatizados aprovados.**

- Navegação pública, cards, modal, filtros, carrinho e persistência após recarregar.
- Login, cadastro de produto, pré-visualização e logout no painel.
- Largura de 390 px sem overflow horizontal, menu mobile e navegação.
- Upload pelo formulário, novo slide publicado, edição da história e WhatsApp configurável.

Os principais fluxos executados não emitiram erros de JavaScript. Foram inspecionadas capturas de tela do site e do painel nas larguras de desktop e celular. O instalador padrão do Chromium falhou neste ambiente; foi usado um executável alternativo local de Chromium para concluir a validação. Para repetir normalmente, instale Chromium com o Playwright. `CHROMIUM_PATH` é opcional e serve apenas quando você já dispõe de outro executável compatível.

## Limites do teste

Não foram executados teste de carga em produção, auditoria externa, integração real com atendimento do WhatsApp, navegadores Safari/Firefox nem instalação em máquina Windows. O link/mensagem do WhatsApp é validado; o envio e a confirmação comercial permanecem com o cliente e o atendimento.
