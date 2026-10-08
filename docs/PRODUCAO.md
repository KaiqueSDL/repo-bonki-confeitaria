# Publicação em produção

Este projeto possui backend e escrita em disco. Hospede em um serviço que execute Node.js e ofereça volume persistente. Uma hospedagem somente de arquivos estáticos não executa o CMS.

## Configuração

1. Instale Node.js 22.13 ou superior e execute `npm ci --omit=dev`.
2. Configure `APP_ORIGIN=https://seu-dominio`, `NODE_ENV=production` e `PORT`.
3. Mantenha `data`, `uploads` e `private` em um volume persistente. Em serviços com disco efêmero, configure `DATA_DIR`, `UPLOADS_DIR` e `PRIVATE_DIR` apontando para o volume; copie o `data/content.json` inicial e as imagens migradas para esses diretórios antes da primeira execução.
4. Crie seu administrador com `npm run setup:admin` em um terminal seguro. Nenhuma credencial padrão é fornecida.
5. Execute `npm start` sob um supervisor de processo que reinicie em falhas.
6. Coloque um proxy HTTPS na frente do Node. Mantenha a porta interna privada e o domínio público igual a `APP_ORIGIN`.
7. Faça backup periódico dos três diretórios persistentes fora do servidor.

O backend não confia em X-Forwarded-For. Atrás de um proxy, o limite de login é agregado no IP do proxy, de forma conservadora. Para uma equipe maior, configure limitação no proxy por cliente e avalie um armazenamento compartilhado de sessões. Não habilite confiança irrestrita em headers do cliente.

## Limites desta versão

- Uma instância Node por armazenamento. Não use cluster, múltiplas réplicas ou funções serverless para gravar o mesmo JSON.
- Um administrador configurado por instalação. O script de configuração também pode redefinir sua senha; reinicie o servidor para invalidar sessões antigas após essa operação.
- Alterações são publicadas ao salvar. As prévias não gravam conteúdo; não há fluxo separado de aprovação/agendamento.
- Backups anteriores e mídias excluídas são retidos; planeje retenção e cópia externa conforme o volume de uso. Uploads abandonados ficam visíveis como sem referência e podem ser excluídos pelo painel.
- O sistema monta pedidos para o WhatsApp e consulta o catálogo atualizado antes de enviar. Não reserva estoque nem cria transação de venda. A disponibilidade e os valores finais são confirmados no atendimento.

## Recuperação

Pare o servidor. Escolha o snapshot desejado em `private/backups`. Faça uma cópia do estado atual antes da restauração. Restaure o snapshot como `data/content.json`; se alguma imagem referenciada foi excluída depois, recupere seus bytes de `private/media-trash` para o caminho indicado em seu registro de mídia. Reinicie e confira catálogo, carrossel, história e arquivos públicos. Nunca exponha `private` em uma hospedagem estática.

Após falha abrupta, `server.lock` com PID inexistente é removido na próxima inicialização. Se o processo ainda estiver vivo, pare-o antes de tentar outro servidor; não apague um lock de processo ativo.

## Alternativa sem disco persistente

Substitua o `ContentRepository` por um repositório transacional de banco de dados e o `MediaService` por armazenamento de objetos. Preserve os formatos JSON da API, IDs, validação, controle de versão e proteção das sessões. O frontend e os formulários não precisam conhecer o banco escolhido. Essa integração é uma evolução futura; não está simulada nesta versão.

## Referências técnicas

- [Segurança em produção no Express](https://expressjs.com/pt-br/advanced/best-practice-security/)
- [Scrypt e comparação segura no Node.js](https://nodejs.org/api/crypto.html)
- [Sharp: processamento e formatos de saída](https://sharp.pixelplumbing.com/api-output/)
