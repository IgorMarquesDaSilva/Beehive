<div align="center">

```
██████╗ ███████╗███████╗██╗  ██╗██╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝██║  ██║██║██║   ██║██╔════╝
██████╔╝█████╗  █████╗  ███████║██║██║   ██║█████╗  
██╔══██╗██╔══╝  ██╔══╝  ██╔══██║██║╚██╗ ██╔╝██╔══╝  
██████╔╝███████╗███████╗██║  ██║██║ ╚████╔╝ ███████╗
╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
```

**Plataforma de Comunicação Empresarial Interna**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

🌐 **[Acesse o Beehive](https://beehive-production-9bd0.up.railway.app)**

</div>

---

## 🐝 Sobre o Projeto

O **Beehive** é uma plataforma SaaS de comunicação empresarial interna desenvolvida como protótipo acadêmico para o curso de Análise e Desenvolvimento de Sistemas. O projeto centraliza as interações corporativas em canais organizados por departamento, eliminando a fragmentação causada por e-mails, chats informais e reuniões excessivas.

A plataforma foi construída com foco em **rastreabilidade**, **organização** e **comunicação em tempo real**, servindo como base para uma solução competitiva voltada a PMEs e startups.

---

## ✨ Funcionalidades

- 🔐 **Autenticação segura** — Login e cadastro com senha criptografada via bcrypt e sessão gerenciada por JWT em cookie httpOnly
- 💬 **Chat em tempo real** — Mensagens instantâneas via WebSocket com Socket.io
- 📢 **Canais por departamento** — Comunicação organizada em canais separados (#geral, #ti, #rh, #projetos)
- ➕ **Criar canais** — Crie novos canais diretamente pela interface
- 📜 **Histórico de mensagens** — Mensagens persistidas no banco e carregadas ao entrar no canal
- ✍️ **Indicador de digitando** — Veja em tempo real quando alguém está digitando
- ⏰ **Horário nas mensagens** — Cada mensagem exibe o horário de envio
- 🗑️ **Apagar mensagens** — Autores podem apagar suas próprias mensagens
- 👤 **Página de perfil** — Edite nome, bio e senha
- 🎨 **Interface moderna** — Visual escuro com identidade própria

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js |
| Framework web | Express |
| Tempo real | Socket.io |
| Banco de dados | MySQL |
| Autenticação | JWT + bcrypt |
| Front-end | HTML, CSS, JavaScript puro |
| Deploy | Railway |

---

## 📁 Estrutura do Projeto

```
beehive/
├── src/
│   ├── config/
│   │   └── db.js                # Conexão com o MySQL
│   ├── controllers/
│   │   ├── authController.js    # Lógica de login, cadastro e logout
│   │   └── chatController.js    # Lógica de canais e mensagens
│   ├── routes/
│   │   ├── authRoutes.js        # Rotas de autenticação
│   │   └── chatRoutes.js        # Rotas do chat
│   ├── middlewares/
│   │   └── authMiddleware.js    # Verificação de token JWT
│   └── socket/
│       └── chatSocket.js        # Lógica do chat em tempo real
├── public/
│   ├── css/
│   │   └── style.css            # Estilos globais
│   ├── js/
│   │   ├── login.js             # Lógica da tela de login
│   │   ├── chat.js              # Lógica da tela de chat
│   │   └── perfil.js            # Lógica da tela de perfil
│   └── pages/
│       ├── login.html           # Tela de login e cadastro
│       ├── chat.html            # Tela principal do chat
│       └── perfil.html          # Tela de perfil do usuário
├── .env.example                 # Modelo de variáveis de ambiente
├── .gitignore
├── package.json
└── server.js                    # Ponto de entrada da aplicação
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- [XAMPP](https://www.apachefriends.org/) com MySQL rodando

### 1. Clone o repositório

```bash
git clone https://github.com/IgorMarquesDaSilva/Beehive.git
cd Beehive
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=beehive
DB_PORT=3306
JWT_SECRET=beehive_segredo_123
```

> ⚠️ Se o seu MySQL tiver senha, preencha `DB_PASSWORD`.

### 4. Configure o banco de dados

Abra o **phpMyAdmin** e execute o SQL disponível em `schema.sql`.

### 5. Inicie o servidor

```bash
node server.js
```

Acesse **http://localhost:3000** no navegador.

---

## ☁️ Deploy

O Beehive está hospedado no **Railway** com banco de dados MySQL em nuvem.

🌐 **[beehive-production-9bd0.up.railway.app](https://beehive-production-9bd0.up.railway.app)**

Para fazer deploy de uma nova versão basta dar `git push` — o Railway detecta automaticamente e atualiza o site.

---

## 🔒 Segurança

- Senhas armazenadas com hash **bcrypt**
- Autenticação via **JWT** com expiração de 8 horas
- Token armazenado em **cookie httpOnly** — inacessível pelo JavaScript do front
- Rotas protegidas por middleware de autenticação no back-end
- Credenciais fora do código-fonte via **variáveis de ambiente**

---

## 🗺️ Roadmap

- [ ] Contagem de usuários online por canal
- [ ] Notificações de novas mensagens
- [ ] Busca no histórico de mensagens
- [ ] Mencionar usuários com @
- [ ] Integração com IA para resumo de conversas

---

## 📄 Contexto Acadêmico

Projeto desenvolvido para a disciplina de **Elaboração de Negócio Competitivo** do curso de Análise e Desenvolvimento de Sistemas. O Beehive foi concebido como uma plataforma SaaS com proposta de valor baseada na centralização da comunicação corporativa e geração de inteligência organizacional a partir do fluxo de conversas.

---

<div align="center">

Feito com 🐝 e muito Node.js

</div>