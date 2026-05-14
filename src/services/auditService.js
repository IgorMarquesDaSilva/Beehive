const db = require("../config/db");

function shouldIgnoreAuditError(err) {
  return ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err?.code);
}

function toJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

async function registrarAuditoria({
  usuario,
  req,
  acao,
  entidade,
  entidadeId = null,
  dadosAntes = null,
  dadosDepois = null,
}) {
  try {
    await db.query(
      `
      INSERT INTO auditoria_logs
        (
          workspace_id,
          membro_id,
          usuario_id,
          acao,
          entidade,
          entidade_id,
          dados_antes,
          dados_depois,
          ip,
          user_agent
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        usuario?.workspace_id || null,
        usuario?.membro_id || null,
        usuario?.id || null,
        acao,
        entidade,
        entidadeId,
        toJson(dadosAntes),
        toJson(dadosDepois),
        req?.ip || null,
        req?.get?.("user-agent") || null,
      ]
    );
  } catch (err) {
    if (shouldIgnoreAuditError(err)) return;
    console.error("Erro ao registrar auditoria:", err);
  }
}

module.exports = {
  registrarAuditoria,
};
