# Reuniões De Voz

O Beehive usa reuniões independentes dos canais de texto. Cada reunião possui
um organizador, uma lista de convidados e um histórico de participantes.

## Fluxo

1. Um membro cria uma reunião e seleciona até oito convidados.
2. Cada convidado recebe uma notificação e pode aceitar ou recusar.
3. Somente o organizador e convidados que aceitaram podem entrar.
4. O organizador pode encerrar a reunião para todos.
5. Entradas, saídas e estado do convite ficam registrados no banco.

O áudio continua usando WebRTC. O Socket.IO é responsável apenas pela presença
e pela troca segura de `offer`, `answer` e candidatos ICE entre sockets que já
estão na mesma reunião.

## Banco

Antes de publicar o código, aplique a migration:

```bash
npm run db:status
npm run db:migrate
```

A migration `005_independent_meetings.sql` cria:

- `reunioes`
- `reuniao_convites`
- `reuniao_participantes`

As tabelas antigas de voz são preservadas apenas como histórico e não são mais
usadas pelo sistema.

## Configuração WebRTC

Configure no Render:

```text
STUN_URL=stun:stun.l.google.com:19302
TURN_URLS=turn:host:porta,turn:host:porta?transport=tcp,turns:host:porta
TURN_USERNAME=usuario
TURN_CREDENTIAL=senha
```

O servidor entrega essa configuração somente a usuários autenticados e impede
cache da resposta.

As credenciais TURN que já estiveram no JavaScript público devem ser revogadas
no provedor. Gere credenciais novas antes do deploy e nunca coloque os valores
reais no Git.

Sem TURN, chamadas podem funcionar em redes simples usando apenas STUN, mas
podem falhar entre redes corporativas, CGNAT ou firewalls restritivos.

## Verificação Manual

Use duas contas em navegadores ou dispositivos diferentes:

1. Criar uma reunião com a segunda conta como convidada.
2. Confirmar que o convite aparece sem recarregar a página.
3. Recusar o convite e confirmar que a reunião desaparece da lista.
4. Criar outra reunião, aceitar e permitir o microfone.
5. Confirmar áudio nos dois sentidos.
6. Testar ativar e desativar o microfone.
7. Sair como convidado.
8. Encerrar como organizador e confirmar que todos saem da sala.
