<div align="center">

<br>

```
██████╗ ███████╗███████╗██╗  ██╗██╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝██║  ██║██║██║   ██║██╔════╝
██████╔╝█████╗  █████╗  ███████║██║██║   ██║█████╗  
██╔══██╗██╔══╝  ██╔══╝  ██╔══██║██║╚██╗ ██╔╝██╔══╝  
██████╔╝███████╗███████╗██║  ██║██║ ╚████╔╝ ███████╗
╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
```

**Plataforma de Comunicação Empresarial em Tempo Real**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-FF6B00?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

<br>

> 💬 Chat em tempo real &nbsp;•&nbsp; 🎙️ Voz por canal &nbsp;•&nbsp; 🔒 Canais privados &nbsp;•&nbsp; 📁 Upload de arquivos

<br>

[![Live Demo](https://img.shields.io/badge/🌐_Acessar_Plataforma-beehive--phmp.onrender.com-FBBC04?style=for-the-badge)](https://beehive-phmp.onrender.com)

<br>

</div>

---

## 📌 Sobre o Projeto

O **Beehive** é uma plataforma de comunicação empresarial desenvolvida para centralizar a comunicação interna de equipes e organizações em um único ambiente moderno e organizado.

Inspirado em plataformas como **Discord** e **Slack**, o sistema oferece comunicação em tempo real com canais organizados, sistema de permissões, chamadas de voz, compartilhamento de arquivos e gerenciamento de usuários — tudo em uma arquitetura pensada para aplicações SaaS reais.

> Projeto acadêmico desenvolvido no curso de **Análise e Desenvolvimento de Sistemas**, estruturado com foco em boas práticas de engenharia de software.

---

## ✨ Funcionalidades

<details>
<summary><strong>🔐 Autenticação e Segurança</strong></summary>

<br>

- Login e cadastro de usuários
- Senhas criptografadas com **bcrypt**
- Autenticação via **JWT** com expiração
- Cookies **httpOnly**
- Middleware de proteção de rotas
- Controle de permissões por cargo

</details>

<details>
<summary><strong>💬 Chat em Tempo Real</strong></summary>

<br>

- Mensagens instantâneas via **Socket.io**
- Histórico persistido no **MySQL**
- Indicador de "digitando..."
- Timestamp nas mensagens
- Exclusão de mensagens
- Menções com `@usuário`
- Notificações visuais por canal

</details>

<details>
<summary><strong>🔒 Sistema de Permissões</strong></summary>

<br>

- Canais públicos e privados
- Controle de acesso por usuário
- Papéis: **Admin** e **Moderador**
- Exclusão de canais
- Proteção no backend e no Socket.io

</details>

<details>
<summary><strong>🎙️ Comunicação por Voz</strong></summary>

<br>

- Voz em tempo real via **WebRTC**
- Entrada por canal
- Lista de participantes em tempo real
- Conexão peer-to-peer

</details>

<details>
<summary><strong>📁 Compartilhamento de Arquivos</strong></summary>

<br>

- Upload de imagens e documentos
- Integração com **Cloudinary**
- Preview e visualização inline de imagens

</details>

<details>
<summary><strong>👤 Perfil do Usuário</strong></summary>

<br>

- Alteração de nome e senha
- Bio personalizada
- Avatar com iniciais

</details>

---

## 🛠️ Stack Tecnológica

| Categoria | Tecnologia |
|:---|:---|
| **Runtime** | Node.js |
| **Framework** | Express |
| **Tempo real** | Socket.io |
| **Voz** | WebRTC |
| **Banco de dados** | MySQL |
| **Upload** | Multer + Cloudinary |
| **Autenticação** | JWT + bcrypt |
| **Front-end** | HTML, CSS, JavaScript |
| **Deploy** | Render |
| **Versionamento** | Git + GitHub |

---

## 📁 Estrutura do Projeto

```bash
beehive/
│
├── public/               # Assets estáticos
│   ├── css/
│   ├── js/
│   └── pages/
│
├── src/
│   ├── config/           # Configurações (DB, Cloudinary)
│   ├── controllers/      # Lógica de negócio
│   ├── middlewares/      # Autenticação e permissões
│   ├── routes/           # Rotas da API
│   └── socket/           # Eventos Socket.io
│
├── .env
├── package.json
├── server.js
└── README.md
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org) v18+
- [MySQL](https://mysql.com) rodando localmente
- Conta no [Cloudinary](https://cloudinary.com) (para upload de arquivos)

### Passo a passo

**1. Clone o repositório**
```bash
git clone https://github.com/IgorMarquesDaSilva/Beehive.git
cd Beehive
```

**2. Instale as dependências**
```bash
npm install
```

**3. Configure o `.env`**
```env
PORT=3000

# Banco de dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=beehive
DB_PORT=3306

# Autenticação
JWT_SECRET=seu_token_jwt_aqui

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**4. Inicie o servidor**
```bash
npm start
```

**5. Acesse no navegador**
```
http://localhost:3000
```

---

## ☁️ Deploy

A aplicação está hospedada no **Render** e pode ser acessada em:

🔗 **[https://beehive-phmp.onrender.com](https://beehive-phmp.onrender.com)**

---

## 🗺️ Roadmap

### Implementado
- [x] Chat em tempo real
- [x] Comunicação por voz (WebRTC)
- [x] Upload de arquivos
- [x] Canais privados
- [x] Sistema de permissões
- [x] Papéis Admin e Moderador

### Próximas etapas
- [ ] Compartilhamento de tela
- [ ] Chamadas de vídeo
- [ ] Mensagens fixadas
- [ ] Threads
- [ ] Busca avançada
- [ ] IA para resumo de canais
- [ ] Painel administrativo
- [ ] Notificações push

---

## 🎯 Motivação

O Beehive nasceu da vontade de criar uma solução real de comunicação empresarial, aplicando na prática conceitos de:

- Arquitetura de software
- Sistemas distribuídos
- Comunicação em tempo real
- Segurança web
- Experiência do usuário
- Estrutura SaaS

---

## 👨‍💻 Autor

**Igor Marques da Silva**  
Curso de Análise e Desenvolvimento de Sistemas

[![GitHub](https://img.shields.io/badge/GitHub-IgorMarquesDaSilva-181717?style=flat-square&logo=github)](https://github.com/IgorMarquesDaSilva)

---

<div align="center">

**🐝 Beehive — Comunicação inteligente para equipes modernas**

</div>