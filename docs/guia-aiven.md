# Guia De Migracao Para Aiven

Este guia mostra o caminho para trocar o MySQL do Railway pelo Aiven sem perder os dados do Beehive.

Fontes oficiais usadas como referencia:

- Aiven: https://aiven.io/docs/products/mysql/get-started
- Aiven backup/restore: https://aiven.io/docs/products/mysql/howto/migrate-database-mysqldump
- Aiven SSL: https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench
- Render deploys: https://render.com/docs/deploys/
- Render variaveis de ambiente: https://render.com/docs/configure-environment-variables

## 1. Criar O MySQL No Aiven

No Aiven Console:

1. Entre no projeto.
2. Clique em **Services**.
3. Clique em **Create service**.
4. Escolha **MySQL**.
5. Escolha o tier/plano disponivel para o projeto.
6. De um nome, por exemplo `beehive-mysql`.
7. Crie o servico e espere o status ficar **Running**.

Observacao: a propria documentacao do Aiven diz que, no Free tier, pode nao ser possivel escolher provedor cloud ou regiao especifica.

## 2. Copiar A URL De Conexao

No servico MySQL do Aiven:

1. Abra **Overview**.
2. Procure **Connection information** ou **Quick connect**.
3. Copie a URL/Service URI do MySQL.
4. Ela normalmente aponta para o banco `defaultdb` e usa o usuario `avnadmin`.

No `.env` local, use a URL nova temporariamente:

```env
MYSQL_PUBLIC_URL=mysql://avnadmin:SENHA@HOST:PORTA/defaultdb?ssl-mode=REQUIRED
DB_SSL=true
```

Nao commite o `.env`. Esse arquivo fica local e esta no `.gitignore`.

## 3. Gerar Backup Atual Do Railway

Antes de trocar o `.env` para Aiven, deixe ele apontando para o Railway e rode:

```bash
npm run db:backup
```

O backup vai aparecer em `backups/`. Use o arquivo mais recente.

## 4. Restaurar O Backup No Aiven

Depois de trocar `MYSQL_PUBLIC_URL` no `.env` local para a URL do Aiven, rode:

```bash
npm run db:restore -- --file backups/NOME-DO-BACKUP.sql --confirm
```

Esse comando importa estrutura e dados no banco alvo. Use de preferencia em um banco novo/vazio.

Depois confira as migrations:

```bash
npm run db:status
```

Se alguma estiver pendente:

```bash
npm run db:migrate
```

## 5. Testar Localmente

Com o `.env` apontando para o Aiven, rode o projeto e teste:

1. Login.
2. Listagem de canais.
3. Envio de mensagem.
4. Upload de arquivo.
5. Canal privado.
6. Entrada e saida de voz.
7. Alteracao de cargo.

## 6. Trocar No Render

No Render Dashboard:

1. Abra o Web Service do Beehive.
2. Va em **Environment**.
3. Atualize `MYSQL_PUBLIC_URL` ou `MYSQL_URL` com a URL do Aiven.
4. Adicione `DB_SSL=true` se a URL do Aiven usar SSL.
5. Salve usando a opcao de salvar e redeploy.

O Render pode fazer deploy automatico quando recebe push na branch vinculada, como `main`. Mesmo assim, a troca de banco so acontece quando a variavel de ambiente no Render for atualizada.

## 7. Ordem Recomendada

Ordem segura:

1. Banco Railway funcionando.
2. Backup atual do Railway.
3. Banco Aiven criado.
4. Restore do backup no Aiven.
5. Teste local apontando para Aiven.
6. Troca da URL no Render.
7. Deploy.
8. Teste final no site publicado.

## Se Der Erro De SSL

O Aiven recomenda SSL para conexoes. O projeto ja entende:

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
MYSQL_SSL_CA=
MYSQL_SSL_CA_FILE=
```

Se voce baixar o certificado CA do Aiven, pode usar `MYSQL_SSL_CA_FILE` com o caminho do arquivo. Para teste rapido, `DB_SSL_REJECT_UNAUTHORIZED=false` pode contornar erro de certificado, mas a configuracao mais correta e usar o CA.
