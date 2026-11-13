const mysql = require("mysql2/promise");
const { buildDbOptions } = require("../src/config/databaseOptions");

const ADMIN_EMAIL = "igor@gmail.com";
const KEEP_CHANNELS = new Set(["geral", "projetos", "ti", "rh"]);
const KNOWN_TABLES = new Set([
  "usuarios",
  "canais",
  "mensagens",
  "mensagem_anexos",
  "salas_voz",
  "voz_participantes",
  "canal_membros",
  "workspaces",
  "papeis",
  "workspace_membros",
  "auditoria_logs",
  "reunioes",
  "reuniao_convites",
  "reuniao_participantes",
  "schema_migrations",
]);
const DELETE_ORDER = [
  "reuniao_participantes",
  "reuniao_convites",
  "reunioes",
  "voz_participantes",
  "salas_voz",
  "auditoria_logs",
  "mensagem_anexos",
  "mensagens",
  "canal_membros",
];

async function run() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes(ADMIN_EMAIL)) {
    throw new Error(`Para aplicar, use: node scripts/cleanupDemoData.js --apply ${ADMIN_EMAIL}`);
  }

  const connection = await mysql.createConnection(buildDbOptions());
  try {
    const [tables] = await connection.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
    );
    const existing = new Set(tables.map((table) => table.name));
    const unknown = [...existing].filter((name) => !KNOWN_TABLES.has(name));
    if (unknown.length) {
      throw new Error(`Tabelas não previstas: ${unknown.join(", ")}. Revise as dependências antes da limpeza.`);
    }
    for (const required of ["usuarios", "canais", "mensagens", "workspace_membros"]) {
      if (!existing.has(required)) throw new Error(`Tabela obrigatória ausente: ${required}`);
    }

    const [admins] = await connection.execute(
      "SELECT id, cargo FROM usuarios WHERE LOWER(email) = ?",
      [ADMIN_EMAIL]
    );
    if (admins.length !== 1 || admins[0].cargo !== "admin") {
      throw new Error("O administrador esperado não existe ou não possui cargo admin. Nenhum dado foi apagado.");
    }
    const adminId = admins[0].id;

    const [channels] = await connection.query(
      "SELECT id, nome FROM canais WHERE privado = 0 ORDER BY id"
    );
    const kept = channels.filter((channel) => KEEP_CHANNELS.has(channel.nome.toLowerCase()));
    if (!kept.length) {
      throw new Error("Nenhum dos canais públicos esperados foi encontrado. Nenhum dado foi apagado.");
    }

    const counts = {};
    for (const table of [...DELETE_ORDER, "canais", "workspace_membros", "usuarios"]) {
      if (!existing.has(table)) continue;
      const [[row]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
      counts[table] = row.total;
    }
    console.log(JSON.stringify({ adminPreservado: ADMIN_EMAIL, canaisPreservados: kept.map((c) => c.nome), registrosAntes: counts }, null, 2));
    if (!apply) {
      console.log(`Simulação apenas. Para executar: node scripts/cleanupDemoData.js --apply ${ADMIN_EMAIL}`);
      return;
    }

    await connection.beginTransaction();
    try {
      for (const table of DELETE_ORDER) {
        if (existing.has(table)) await connection.query(`DELETE FROM \`${table}\``);
      }

      const ids = kept.map((channel) => channel.id);
      await connection.query("DELETE FROM canais WHERE id NOT IN (?)", [ids]);
      await connection.query("UPDATE canais SET criado_por_membro_id = NULL WHERE id IN (?)", [ids]);
      await connection.execute("DELETE FROM workspace_membros WHERE usuario_id <> ?", [adminId]);
      await connection.execute("DELETE FROM usuarios WHERE id <> ?", [adminId]);

      const [[remainingUsers]] = await connection.query("SELECT COUNT(*) AS total FROM usuarios");
      const [[remainingMessages]] = await connection.query("SELECT COUNT(*) AS total FROM mensagens");
      const [[remainingChannels]] = await connection.query("SELECT COUNT(*) AS total FROM canais");
      if (remainingUsers.total !== 1 || remainingMessages.total !== 0 || remainingChannels.total !== ids.length) {
        throw new Error("A verificação final falhou; a transação será revertida.");
      }
      await connection.commit();
      console.log(`Limpeza concluída: 1 admin, ${remainingChannels.total} canais e 0 mensagens.`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Falha na limpeza: ${error.code || error.message}`);
  process.exitCode = 1;
});
