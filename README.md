````md
<div align="center">

# 🐝 Beehive

### Plataforma de Comunicação Empresarial em Tempo Real

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
<img src="https://img.shields.io/badge/WebRTC-FF6B00?style=for-the-badge" />
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
<img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" />
<img src="https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white" />

<br><br>

💬 Chat em tempo real • 🎙️ Voz por canal • 🔒 Canais privados • 📁 Upload de arquivos

</div>

---

# 📌 Sobre o Projeto

O **Beehive** é uma plataforma de comunicação empresarial desenvolvida para centralizar a comunicação interna de equipes e organizações em um único ambiente moderno e organizado.

O sistema foi inspirado em plataformas como **Discord** e **Slack**, oferecendo comunicação em tempo real com canais organizados, permissões, chamadas de voz, compartilhamento de arquivos e gerenciamento de usuários.

O projeto foi desenvolvido como iniciativa acadêmica no curso de **Análise e Desenvolvimento de Sistemas**, mas foi estruturado com foco em arquitetura real de aplicações SaaS modernas.

---

# ✨ Funcionalidades

## 🔐 Autenticação e Segurança

- Login e cadastro de usuários
- Senhas criptografadas com bcrypt
- Autenticação JWT
- Cookies httpOnly
- Middleware de proteção de rotas
- Controle de permissões por cargo

---

## 💬 Chat em Tempo Real

- Mensagens instantâneas com Socket.io
- Histórico persistido no MySQL
- Indicador de digitando
- Horário nas mensagens
- Exclusão de mensagens
- Menções com @usuário
- Notificações visuais por canal

---

## 🔒 Sistema de Permissões

- Canais públicos
- Canais privados
- Controle de acesso por usuários
- Admin e moderador
- Exclusão de canais
- Proteção completa no backend e Socket.io

---

## 🎙️ Comunicação por Voz

- Voz em tempo real via WebRTC
- Entrada por canal
- Lista de participantes
- Conexão peer-to-peer
- Atualização em tempo real

---

## 📁 Compartilhamento de Arquivos

- Upload de imagens
- Upload de documentos
- Integração com Cloudinary
- Preview de arquivos
- Visualização inline de imagens

---

## 👤 Perfil do Usuário

- Alteração de nome
- Alteração de senha
- Bio personalizada
- Avatar com iniciais

---

# 🖼️ Interface

O Beehive possui:

- Interface moderna
- Tema escuro
- Sidebar estilo Discord
- Painel lateral inteligente
- Organização visual corporativa
- Layout responsivo

---

# 🛠️ Tecnologias Utilizadas

| Categoria | Tecnologia |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Comunicação em tempo real | Socket.io |
| Voz em tempo real | WebRTC |
| Banco de dados | MySQL |
| Upload de arquivos | Multer + Cloudinary |
| Autenticação | JWT + bcrypt |
| Front-end | HTML, CSS e JavaScript |
| Deploy | Render |
| Versionamento | Git + GitHub |

---

# 📁 Estrutura do Projeto

```bash
beehive/
│
├── public/
│   ├── css/
│   ├── js/
│   └── pages/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── socket/
│
├── .env
├── package.json
├── server.js
└── README.md
````

---

# ⚙️ Como Rodar Localmente

## 1️⃣ Clone o repositório

```bash
git clone https://github.com/IgorMarquesDaSilva/Beehive.git
```

---

## 2️⃣ Entre na pasta

```bash
cd Beehive
```

---

## 3️⃣ Instale as dependências

```bash
npm install
```

---

## 4️⃣ Configure o arquivo .env

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=beehive
DB_PORT=3306

JWT_SECRET=seu_token_jwt

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 5️⃣ Inicie o servidor

```bash
npm start
```

---

## 6️⃣ Acesse no navegador

```txt
http://localhost:3000
```

---

# ☁️ Deploy

O projeto está hospedado no Render.

## 🌐 Link do sistema

```txt
https://beehive-phmp.onrender.com
```

---

# 🔒 Segurança

* JWT com expiração
* Cookies httpOnly
* Senhas criptografadas
* Rotas protegidas
* Validação de acesso em canais privados
* Proteção no Socket.io
* Controle de permissões por cargo

---

# 🚀 Roadmap

* [x] Chat em tempo real
* [x] Voz por canal
* [x] Upload de arquivos
* [x] Canais privados
* [x] Sistema de permissões
* [x] Admin e moderador
* [ ] Compartilhamento de tela
* [ ] Chamada de vídeo
* [ ] Mensagens fixadas
* [ ] Threads
* [ ] Busca avançada
* [ ] IA para resumo de canais
* [ ] Painel administrativo
* [ ] Notificações push

---

# 🎯 Objetivo do Projeto

O objetivo do Beehive é criar uma solução moderna de comunicação empresarial capaz de centralizar mensagens, arquivos e comunicação por voz em uma única plataforma.

Além do aprendizado acadêmico, o projeto também busca aplicar conceitos reais de:

* Arquitetura de software
* Sistemas distribuídos
* Comunicação em tempo real
* Segurança web
* Experiência do usuário
* Estrutura SaaS

---

# 👨‍💻 Desenvolvido por

### Igor Marques da Silva

Projeto acadêmico desenvolvido no curso de Análise e Desenvolvimento de Sistemas.

---

<div align="center">

### 🐝 Beehive — Comunicação inteligente para equipes modernas

</div>