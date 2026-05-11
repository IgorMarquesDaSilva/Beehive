const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./src/routes/authRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const initSocket = require("./src/socket/chatSocket");
const db = require("./src/config/db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "public/uploads"))
);

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.redirect("/pages/login.html");
});

initSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

async function adicionarColunaSeNaoExistir(tabela, coluna, definicao) {
  try {
    const [colunas] = await db.query(`SHOW COLUMNS FROM ${tabela} LIKE ?`, [
      coluna,
    ]);

    if (colunas.length === 0) {
      await db.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
      console.log(`Coluna ${coluna} adicionada em ${tabela}`);
    }
  } catch (err) {
    console.error(`Erro ao verificar coluna ${coluna}:`, err);
  }
}

async function inicializarBanco() {
  let tentativas = 0;
  const maxTentativas = 10;

  while (tentativas < maxTentativas) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id int(11) NOT NULL AUTO_INCREMENT,
          nome varchar(100) NOT NULL,
          email varchar(100) NOT NULL,
          senha varchar(255) NOT NULL,
          bio varchar(255) DEFAULT NULL,
          cargo varchar(30) DEFAULT 'usuario',
          status varchar(30) DEFAULT 'offline',
          criado_em datetime DEFAULT current_timestamp(),
          PRIMARY KEY (id),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS canais (
          id int(11) NOT NULL AUTO_INCREMENT,
          nome varchar(100) NOT NULL,
          descricao varchar(255) DEFAULT NULL,
          privado tinyint(1) DEFAULT 0,
          PRIMARY KEY (id),
          UNIQUE KEY nome (nome)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS mensagens (
          id int(11) NOT NULL AUTO_INCREMENT,
          usuario_id int(11) NOT NULL,
          canal_id int(11) NOT NULL,
          texto text DEFAULT NULL,
          arquivo_url varchar(255) DEFAULT NULL,
          arquivo_nome varchar(255) DEFAULT NULL,
          arquivo_tipo varchar(100) DEFAULT NULL,
          enviado_em datetime DEFAULT current_timestamp(),
          PRIMARY KEY (id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          FOREIGN KEY (canal_id) REFERENCES canais(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS salas_voz (
          id int(11) NOT NULL AUTO_INCREMENT,
          canal_id int(11) NOT NULL,
          usuario_id int(11) NOT NULL,
          entrou_em datetime DEFAULT current_timestamp(),
          PRIMARY KEY (id),
          FOREIGN KEY (canal_id) REFERENCES canais(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          UNIQUE KEY canal_usuario (canal_id, usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS canal_membros (
          id int(11) NOT NULL AUTO_INCREMENT,
          canal_id int(11) NOT NULL,
          usuario_id int(11) NOT NULL,
          criado_em datetime DEFAULT current_timestamp(),
          PRIMARY KEY (id),
          FOREIGN KEY (canal_id) REFERENCES canais(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          UNIQUE KEY canal_usuario (canal_id, usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await adicionarColunaSeNaoExistir(
        "usuarios",
        "cargo",
        "varchar(30) DEFAULT 'usuario'"
      );

      await adicionarColunaSeNaoExistir(
        "usuarios",
        "status",
        "varchar(30) DEFAULT 'offline'"
      );

      await adicionarColunaSeNaoExistir(
        "canais",
        "privado",
        "tinyint(1) DEFAULT 0"
      );

      await adicionarColunaSeNaoExistir(
        "mensagens",
        "arquivo_url",
        "varchar(255) DEFAULT NULL"
      );

      await adicionarColunaSeNaoExistir(
        "mensagens",
        "arquivo_nome",
        "varchar(255) DEFAULT NULL"
      );

      await adicionarColunaSeNaoExistir(
        "mensagens",
        "arquivo_tipo",
        "varchar(100) DEFAULT NULL"
      );

      await db.query(`
        INSERT IGNORE INTO canais (nome, descricao, privado) VALUES
        ('geral', 'Canal geral da empresa', 0),
        ('ti', 'Canal do departamento de TI', 0),
        ('rh', 'Canal do departamento de RH', 0),
        ('projetos', 'Canal de acompanhamento de projetos', 0)
      `);

      await db.query(`
        UPDATE usuarios
        SET status = 'offline'
      `);

      console.log("Banco inicializado com sucesso!");
      return;
    } catch (err) {
      tentativas++;

      console.log(
        `Tentativa ${tentativas}/${maxTentativas} falhou. Tentando novamente em 3s...`
      );

      console.error(err);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.error("Não foi possível conectar ao banco.");
}

inicializarBanco();