const db = require("../config/db");

async function buscarReuniaoParaUsuario(reuniaoId, usuarioId) {
  const [reunioes] = await db.query(
    `
    SELECT
      r.id,
      r.workspace_id,
      r.titulo,
      r.criado_por_usuario_id,
      r.status,
      r.criada_em,
      r.encerrada_em,
      rc.status AS convite_status
    FROM reunioes r
    LEFT JOIN reuniao_convites rc
      ON rc.reuniao_id = r.id
      AND rc.usuario_id = ?
    WHERE r.id = ?
      AND (
        r.criado_por_usuario_id = ?
        OR rc.usuario_id IS NOT NULL
      )
    LIMIT 1
    `,
    [usuarioId, reuniaoId, usuarioId]
  );

  return reunioes[0] || null;
}

async function usuarioPodeEntrarReuniao(usuario, reuniaoId) {
  const reuniao = await buscarReuniaoParaUsuario(reuniaoId, usuario.id);

  if (!reuniao || reuniao.status !== "aberta") {
    return { permitido: false, reuniao };
  }

  const organizador =
    Number(reuniao.criado_por_usuario_id) === Number(usuario.id);
  const conviteAceito = reuniao.convite_status === "aceito";

  return {
    permitido: organizador || conviteAceito,
    reuniao,
  };
}

module.exports = {
  buscarReuniaoParaUsuario,
  usuarioPodeEntrarReuniao,
};
