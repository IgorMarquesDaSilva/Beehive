# Guia De Migração Do Banco - Beehive

Este guia foi escrito para executar a migração com segurança, sem precisar conhecer banco de dados a fundo.

## O Que Estamos Fazendo

Vamos evoluir o banco atual para ficar mais próximo do modelo de classes do Beehive.

Nesta primeira etapa, a migração:

- mantém as tabelas atuais funcionando;
- adiciona `workspaces`, `papeis` e `workspace_membros`;
- adiciona campos de transição em `canais`, `mensagens`, `canal_membros` e `salas_voz`;
- cria `mensagem_anexos`;
- cria `auditoria_logs`;
- cria `voz_participantes`;
- registra quais migrations já foram aplicadas em `schema_migrations`.

Nada aqui apaga dados.

## Regra De Ouro

Antes de rodar no banco real:

```text
backup primeiro, migration depois.
```

Se algo sair errado, o backup permite voltar ao estado anterior.

## Passo 1 - Conferir O Banco Atual

No projeto, o app usa estas variáveis:

```env
MYSQL_URL=
MYSQL_PUBLIC_URL=
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=
```

Se `MYSQL_PUBLIC_URL` estiver preenchida, ela tem prioridade. Depois vem `MYSQL_URL`.

Se as duas URLs estiverem vazias, o app usa `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `DB_PORT`.

## Passo 2 - Fazer Backup

### Opção A - Backup Pelo Projeto

Se você não conseguir exportar pelo painel do Railway, use o script do próprio projeto:

```bash
npm run db:backup
```

Esse comando cria um arquivo `.sql` dentro da pasta `backups/`.

A pasta `backups/` não vai para o GitHub, porque foi adicionada ao `.gitignore`.

### Opção B - Backup Pelo Railway

Na documentação oficial do Railway, backups ficam na aba **Backups** do serviço que possui volume. Em alguns casos, a opção aparece nas configurações do serviço. Se isso não aparecer para você, use a Opção A.

### Onde Pegar A Conexão Do Railway

No Railway:

1. Abra o projeto.
2. Entre no serviço do MySQL.
3. Abra **Variables** ou **Connect**.
4. Procure uma variável como `MYSQL_URL`, `MYSQL_PUBLIC_URL` ou URL pública de conexão.
5. Coloque esse valor no `.env` local como:

```env
MYSQL_PUBLIC_URL=mysql://usuario:senha@host:porta/banco
```

Se a URL for interna com `railway.internal`, ela normalmente funciona dentro do Railway, mas pode não funcionar do seu computador. Para rodar backup local, você precisa da URL pública.

## Passo 3 - Ver Migrations Pendentes

Com o `.env` apontando para o banco certo:

```bash
npm run db:backup
```

Se o backup for criado com sucesso, continue.

Depois veja as migrations pendentes:

```bash
npm run db:status
```

Resultado esperado antes de migrar:

```text
001_base_schema.sql: pendente
002_workspace_roles.sql: pendente
003_message_attachments_audit.sql: pendente
004_voice_participants.sql: pendente
```

Se aparecer `aplicada`, significa que aquela migration já rodou antes.

## Passo 4 - Aplicar Migrations

Depois do backup:

```bash
npm run db:migrate
```

Resultado esperado:

```text
Aplicando 001_base_schema.sql...
OK: 001_base_schema.sql
...
Banco atualizado com sucesso.
```

## Passo 5 - Conferir Se Deu Certo

Depois de migrar, confira:

```bash
npm run db:status
```

O esperado é todas aparecerem como `aplicada`.

Depois teste no site:

1. Login.
2. Cadastro, se necessário.
3. Listagem de canais.
4. Envio de mensagem.
5. Upload de arquivo.
6. Canal privado.
7. Alteração de cargo.
8. Entrada e saída de voz.

## Passo 6 - Migrar Para Outro Provedor

Depois que o modelo estiver organizado no Railway, o caminho para trocar de provedor fica mais simples:

1. Fazer backup/export do Railway.
2. Criar banco novo no provedor escolhido.
3. Importar o backup no banco novo.
4. Atualizar `MYSQL_URL` ou variáveis `DB_*` no Render.
5. Rodar `npm run db:status` apontando para o banco novo.
6. Rodar `npm run db:migrate` se houver migration pendente.
7. Testar a aplicação.

## O Que Não Fazer Agora

Não remova ainda:

- `usuarios.cargo`;
- `usuarios.status`;
- campos de arquivo em `mensagens`;
- tabela `salas_voz`.

Esses itens ainda são usados pelo código atual. A migração cria a estrutura nova, mas a troca completa do backend será feita depois, com calma.

## Próxima Etapa Técnica

Depois que as migrations estiverem aplicadas e testadas, a próxima etapa é consolidar o backend para:

1. remover dependências antigas de `usuarios.cargo`;
2. remover dependências antigas dos campos `arquivo_*` em `mensagens`;
3. ampliar os eventos registrados em `auditoria_logs`;
4. remover a criação automática de tabelas do `server.js`;
5. documentar o modelo final do banco depois da estabilização.
