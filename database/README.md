# Banco de Dados do Beehive

Esta pasta concentra a estrutura versionada do banco de dados. A partir de agora, a forma recomendada de evoluir o banco é criar uma nova migration em `database/migrations/`, em vez de alterar tabelas diretamente no `server.js`.

## Antes De Rodar Em Produção

Nunca rode migrations em um banco real sem backup.

Checklist:

1. Exportar backup do banco atual no provedor.
2. Conferir se o `.env` aponta para o banco certo.
3. Rodar `npm run db:status`.
4. Rodar `npm run db:migrate`.
5. Testar login, canais, mensagens, upload e voz.

## Comandos

Criar backup SQL local:

```bash
npm run db:backup
```

Ver migrations pendentes:

```bash
npm run db:status
```

Aplicar migrations:

```bash
npm run db:migrate
```

## Como O Runner Funciona

O script `scripts/migrate.js` cria a tabela `schema_migrations` e registra cada arquivo aplicado.

Se uma migration já aplicada for editada depois, o runner bloqueia a execução. Isso é proposital: em engenharia de software, migrations antigas não devem ser alteradas após irem para um banco compartilhado. Para mudar algo, crie uma migration nova.

## Backup Sem mysqldump

Se a máquina não tiver `mysqldump`, use:

```bash
npm run db:backup
```

O script usa a biblioteca `mysql2`, que já faz parte do projeto, e cria um arquivo `.sql` dentro da pasta `backups/`.

A pasta `backups/` fica no `.gitignore` porque contém dados reais do banco e não deve ir para o GitHub.

## Ordem Das Migrations

| Arquivo | Função |
| --- | --- |
| `001_base_schema.sql` | Garante a estrutura atual usada pelo sistema. |
| `002_workspace_roles.sql` | Adiciona `workspaces`, `papeis`, `workspace_membros` e colunas de transição. |
| `003_message_attachments_audit.sql` | Separa anexos em tabela própria e cria auditoria. |
| `004_voice_participants.sql` | Prepara histórico de participantes de voz sem quebrar `salas_voz`. |

## Migração Em Etapas

Esta primeira versão é compatível com o código atual. Ela adiciona tabelas e colunas novas, mas mantém as tabelas antigas funcionando.

Depois que a aplicação estiver estável com essa estrutura, os próximos passos são:

1. Consolidar todos os fluxos do backend em `workspace_membros`.
2. Remover os campos antigos de arquivo em `mensagens` quando o front estiver usando `mensagem_anexos`.
3. Ampliar logs em `auditoria_logs` para mais eventos de segurança.
4. Remover inicialização automática de tabelas do `server.js`.
