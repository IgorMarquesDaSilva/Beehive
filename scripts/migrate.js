const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { buildDbOptions } = require("../src/config/databaseOptions");

const MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");

function getDbConfig() {
  return buildDbOptions({
    multipleStatements: true,
  });
}

function checksum(content) {
  const normalizedContent = content.replace(/\r\n?/g, "\n");
  return crypto.createHash("sha256").update(normalizedContent).digest("hex");
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id int NOT NULL AUTO_INCREMENT,
      filename varchar(255) NOT NULL,
      checksum varchar(64) NOT NULL,
      executed_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function listMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);

  return files
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function getExecutedMigrations(connection) {
  const [rows] = await connection.query(
    "SELECT filename, checksum, executed_at FROM schema_migrations ORDER BY filename ASC"
  );

  return new Map(rows.map((row) => [row.filename, row]));
}

async function showStatus(connection, files) {
  const executed = await getExecutedMigrations(connection);

  console.log("Status das migrations:\n");

  for (const file of files) {
    const applied = executed.get(file);
    const status = applied ? "aplicada" : "pendente";
    console.log(`- ${file}: ${status}`);
  }
}

async function run() {
  const statusOnly = process.argv.includes("--status");
  const connection = await mysql.createConnection(getDbConfig());

  try {
    await ensureMigrationsTable(connection);

    const files = await listMigrationFiles();

    if (statusOnly) {
      await showStatus(connection, files);
      return;
    }

    const executed = await getExecutedMigrations(connection);

    for (const file of files) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(fullPath, "utf8");
      const hash = checksum(sql);
      const previous = executed.get(file);

      if (previous) {
        if (previous.checksum !== hash) {
          throw new Error(
            `A migration ${file} ja foi aplicada, mas o conteudo mudou. ` +
              "Crie uma nova migration em vez de editar uma antiga."
          );
        }

        console.log(`Ignorando ${file} (ja aplicada)`);
        continue;
      }

      console.log(`Aplicando ${file}...`);

      await connection.query(sql);
      await connection.query(
        "INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)",
        [file, hash]
      );

      console.log(`OK: ${file}`);
    }

    console.log("\nBanco atualizado com sucesso.");
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error("\nErro ao executar migrations:");
  console.error(err.message);
  process.exit(1);
});
