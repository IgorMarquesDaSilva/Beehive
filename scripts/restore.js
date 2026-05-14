const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

function getArgValue(name) {
  const exactIndex = process.argv.indexOf(name);

  if (exactIndex >= 0) {
    return process.argv[exactIndex + 1];
  }

  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));

  return value ? value.slice(prefix.length) : "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printUsage() {
  console.log("Uso:");
  console.log("  npm run db:restore -- --file backups/arquivo.sql --confirm");
  console.log("");
  console.log("Importante: rode apenas em banco novo ou em banco que pode ser substituido.");
}

async function run() {
  const fileArg = getArgValue("--file");

  if (hasFlag("--help")) {
    printUsage();
    process.exit(0);
  }

  if (!fileArg) {
    printUsage();
    process.exit(1);
  }

  if (!hasFlag("--confirm")) {
    console.error("Restaure somente depois de confirmar o banco alvo.");
    console.error("Repita o comando com --confirm para continuar.");
    process.exit(1);
  }

  const backupPath = path.resolve(process.cwd(), fileArg);
  const sql = await fs.readFile(backupPath, "utf8");
  const { buildDbOptions } = require("../src/config/databaseOptions");
  const connection = await mysql.createConnection(
    buildDbOptions({
      multipleStatements: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    })
  );

  try {
    const [[databaseRow]] = await connection.query("SELECT DATABASE() AS database_name");
    const databaseName = databaseRow.database_name || "(sem database selecionado)";

    console.log(`Banco alvo: ${databaseName}`);
    console.log(`Arquivo: ${backupPath}`);
    console.log("Restaurando backup...");

    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    await connection.query(sql);
    await connection.query("SET FOREIGN_KEY_CHECKS=1");

    console.log("Backup restaurado com sucesso.");
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error("\nErro ao restaurar backup:");
  console.error(err.message);
  process.exit(1);
});
