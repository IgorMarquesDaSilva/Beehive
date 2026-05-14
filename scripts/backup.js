const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");
const { buildDbOptions } = require("../src/config/databaseOptions");

const BACKUP_DIR = path.join(__dirname, "..", "backups");

function getDbConfig() {
  return buildDbOptions({
    multipleStatements: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeFilename(value) {
  return String(value || "beehive")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function getTables(connection) {
  const [rows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

  return rows.map((row) => {
    const tableNameKey = Object.keys(row).find((key) => key.startsWith("Tables_in_"));
    return row[tableNameKey];
  });
}

function buildInsert(connection, table, rows) {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]);
  const columnSql = columns.map((column) => connection.escapeId(column)).join(", ");

  const valuesSql = rows
    .map((row) => {
      const values = columns.map((column) => connection.escape(row[column]));
      return `(${values.join(", ")})`;
    })
    .join(",\n");

  return `INSERT INTO ${connection.escapeId(table)} (${columnSql}) VALUES\n${valuesSql};\n`;
}

async function dumpTable(connection, table) {
  const [createRows] = await connection.query(`SHOW CREATE TABLE ${connection.escapeId(table)}`);
  const createSql = createRows[0]["Create Table"];
  const [rows] = await connection.query(`SELECT * FROM ${connection.escapeId(table)}`);

  const chunks = [
    `-- Estrutura da tabela ${table}\n`,
    `DROP TABLE IF EXISTS ${connection.escapeId(table)};\n`,
    `${createSql};\n\n`,
  ];

  if (rows.length > 0) {
    chunks.push(`-- Dados da tabela ${table}\n`);
    chunks.push(buildInsert(connection, table, rows));
    chunks.push("\n");
  }

  return chunks.join("");
}

async function run() {
  const connection = await mysql.createConnection(getDbConfig());

  try {
    const [[databaseRow]] = await connection.query("SELECT DATABASE() AS database_name");
    const databaseName = databaseRow.database_name || process.env.DB_NAME || "beehive";
    const fileName = `${normalizeFilename(databaseName)}-${timestamp()}.sql`;
    const outputPath = path.join(BACKUP_DIR, fileName);

    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const tables = await getTables(connection);
    const parts = [
      `-- Backup do banco ${databaseName}\n`,
      `-- Gerado em ${new Date().toISOString()}\n`,
      "-- Gerado por scripts/backup.js\n\n",
      "SET FOREIGN_KEY_CHECKS=0;\n",
      "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n",
    ];

    for (const table of tables) {
      console.log(`Exportando ${table}...`);
      parts.push(await dumpTable(connection, table));
    }

    parts.push("SET FOREIGN_KEY_CHECKS=1;\n");

    await fs.writeFile(outputPath, parts.join(""), "utf8");

    console.log("\nBackup criado com sucesso:");
    console.log(outputPath);
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error("\nErro ao criar backup:");
  console.error(err.message);
  process.exit(1);
});
