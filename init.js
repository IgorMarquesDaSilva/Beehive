require("dotenv").config();
const db = require("./src/config/db");

async function init() {
  try {
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

    console.log("Banco de dados inicializado com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao inicializar banco:", err);
    process.exit(1);
  }
}

init();