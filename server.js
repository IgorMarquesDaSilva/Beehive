const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const initSocket = require("./src/socket/chatSocket");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.redirect("/pages/login.html");
});

initSocket(io);

async function iniciarServidor() {
  try {
    // inicializa tabelas se não existirem
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`usuarios\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`nome\` varchar(100) NOT NULL,
        \`email\` varchar(100) NOT NULL,
        \`senha\` varchar(255) NOT NULL,
        \`bio\` varchar(255) DEFAULT NULL,
        \`criado_em\` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`canais\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`nome\` varchar(100) NOT NULL,
        \`descricao\` varchar(255) DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`nome\` (\`nome\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`mensagens\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`usuario_id\` int(11) NOT NULL,
        \`canal_id\` int(11) NOT NULL,
        \`texto\` text NOT NULL,
        \`enviado_em\` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (\`id\`),
        FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`),
        FOREIGN KEY (\`canal_id\`) REFERENCES \`canais\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
      INSERT IGNORE INTO \`canais\` (\`nome\`, \`descricao\`) VALUES
      ('geral', 'Canal geral da empresa'),
      ('ti', 'Canal do departamento de TI'),
      ('rh', 'Canal do departamento de RH'),
      ('projetos', 'Canal de acompanhamento de projetos')
    `);

    console.log("Banco inicializado!");

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

iniciarServidor();