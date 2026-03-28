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
- 📜 **Histórico de mensagens** — Mensagens persistidas no banco e carregadas ao entrar no canal
- 🎨 **Interface moderna** — Visual escuro com identidade própria e responsivo

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js |
| Framework web | Express |
| Tempo real | Socket.io |
| Banco de dados | MySQL (XAMPP/MariaDB) |
| Autenticação | JWT + bcrypt |
| Front-end | HTML, CSS, JavaScript puro |

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
│   │   └── chat.js              # Lógica da tela de chat
│   └── pages/
│       ├── login.html           # Tela de login e cadastro
│       └── chat.html            # Tela principal do chat
├── .env                         # Variáveis de ambiente (não versionado)
├── .gitignore
├── package.json
└── server.js                    # Ponto de entrada da aplicação
```

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- [XAMPP](https://www.apachefriends.org/) com MySQL rodando

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/beehive.git
cd beehive
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=beehive
JWT_SECRET=beehive_segredo_123
```

> ⚠️ Se o seu MySQL tiver senha, preencha `DB_PASSWORD`.

### 4. Configure o banco de dados

Abra o **phpMyAdmin** e execute o seguinte SQL:

```sql
CREATE DATABASE beehive;
USE beehive;

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `criado_em` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `canais` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `mensagens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `canal_id` int(11) NOT NULL,
  `texto` text NOT NULL,
  `enviado_em` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`),
  FOREIGN KEY (`canal_id`) REFERENCES `canais`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `canais` (`nome`, `descricao`) VALUES
('geral', 'Canal geral da empresa'),
('ti', 'Canal do departamento de TI'),
('rh', 'Canal do departamento de RH'),
('projetos', 'Canal de acompanhamento de projetos');
```

### 5. Inicie o servidor

```bash
node server.js
```

Acesse **http://localhost:3000** no navegador.

---

## 🔒 Segurança

- Senhas armazenadas com hash **bcrypt**
- Autenticação via **JWT** com expiração de 8 horas
- Token armazenado em **cookie httpOnly** — inacessível pelo JavaScript do front
- Rotas protegidas por middleware de autenticação no back-end
- Credenciais fora do código-fonte via **variáveis de ambiente**

---

## 🗺️ Roadmap

- [ ] Indicador de "usuário digitando..."
- [ ] Criação e gerenciamento de canais pela interface
- [ ] Página de perfil do usuário
- [ ] Notificações de novas mensagens
- [ ] Busca no histórico de mensagens
- [ ] Integração com IA para resumo de conversas

---

## 📄 Contexto Acadêmico

Projeto desenvolvido para a disciplina de **Elaboração de Negócio Competitivo** do curso de Análise e Desenvolvimento de Sistemas. O Beehive foi concebido como uma plataforma SaaS com proposta de valor baseada na centralização da comunicação corporativa e geração de inteligência organizacional a partir do fluxo de conversas.

---

<div align="center">

Feito com 🐝 e muito Node.js

</div>