const db = require("../config/db");
const { registrarAuditoria } = require("../services/auditService");
const { buscarReuniaoParaUsuario } = require("../services/meetingService");

function normalizarConvidados(convidados, usuarioId) {
  if (!Array.isArray(convidados)) return [];

  return [...new Set(convidados.map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0)
    .filter((id) => Number(id) !== Number(usuarioId));
}

function emitirAtualizacao(req, usuarioIds, evento, dados) {
  const io = req.app.get("io");
  if (!io) return;

  [...new Set(usuarioIds.map(Number))].forEach((usuarioId) => {
    io.to(`usuario_${usuarioId}`).emit(evento, dados);
  });
}

function getIceServers(_req, res) {
  const turnUrls = String(process.env.TURN_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const username = process.env.TURN_USERNAME || "";
  const credential = process.env.TURN_CREDENTIAL || "";
  const iceServers = [
    {
      urls:
        process.env.STUN_URL ||
        "stun:stun.l.google.com:19302",
    },
  ];

  if (turnUrls.length > 0 && username && credential) {
    iceServers.push({
      urls: turnUrls,
      username,
      credential,
    });
  }

  res.set("Cache-Control", "no-store");
  res.json({ iceServers });
}

async function listarReunioes(req, res) {
  try {
    const [reunioes] = await db.query(
      `
      SELECT
        r.id,
        r.titulo,
        r.status,
        r.criada_em,
        r.criado_por_usuario_id,
        criador.nome AS criador_nome,
        CASE
          WHEN r.criado_por_usuario_id = ? THEN 'organizador'
          ELSE rc.status
        END AS minha_situacao,
        (
          SELECT COUNT(*)
          FROM reuniao_convites todos_convites
          WHERE todos_convites.reuniao_id = r.id
        ) AS total_convidados,
        (
          SELECT COUNT(*)
          FROM reuniao_participantes rp
          WHERE rp.reuniao_id = r.id
            AND rp.ativo = 1
        ) AS participantes_ativos
      FROM reunioes r
      JOIN usuarios criador ON criador.id = r.criado_por_usuario_id
      LEFT JOIN reuniao_convites rc
        ON rc.reuniao_id = r.id
        AND rc.usuario_id = ?
      WHERE r.status = 'aberta'
        AND (
          r.criado_por_usuario_id = ?
          OR (
            rc.usuario_id IS NOT NULL
            AND rc.status <> 'recusado'
          )
        )
      ORDER BY r.criada_em DESC, r.id DESC
      `,
      [req.usuario.id, req.usuario.id, req.usuario.id]
    );

    res.json(reunioes);
  } catch (err) {
    console.error("Erro ao listar reuniões:", err);
    res.status(500).json({ erro: "Erro ao listar reuniões" });
  }
}

async function criarReuniao(req, res) {
  const titulo = String(req.body?.titulo || "").trim();
  const convidados = normalizarConvidados(
    req.body?.convidados,
    req.usuario.id
  );

  if (titulo.length < 3 || titulo.length > 120) {
    return res.status(400).json({
      erro: "O título deve ter entre 3 e 120 caracteres",
    });
  }

  if (convidados.length > 8) {
    return res.status(400).json({
      erro: "Uma reunião pode ter no máximo 8 convidados",
    });
  }

  let usuariosConvidados = [];

  if (convidados.length > 0) {
    const [usuarios] = await db.query(
      `
      SELECT
        u.id,
        wm.id AS membro_id
      FROM usuarios u
      JOIN workspace_membros wm
        ON wm.usuario_id = u.id
        AND wm.workspace_id = ?
        AND wm.status = 'ativo'
      WHERE u.id IN (?)
      `,
      [req.usuario.workspace_id, convidados]
    );

    if (usuarios.length !== convidados.length) {
      return res.status(400).json({
        erro: "Um ou mais convidados não pertencem ao workspace",
      });
    }

    usuariosConvidados = usuarios;
  }

  const connection = await db.getConnection();
  let reuniaoId;

  try {
    await connection.beginTransaction();

    const [resultado] = await connection.query(
      `
      INSERT INTO reunioes
        (
          workspace_id,
          titulo,
          criado_por_usuario_id,
          criado_por_membro_id,
          status
        )
      VALUES (?, ?, ?, ?, 'aberta')
      `,
      [
        req.usuario.workspace_id || null,
        titulo,
        req.usuario.id,
        req.usuario.membro_id || null,
      ]
    );

    reuniaoId = resultado.insertId;

    await connection.query(
      `
      INSERT INTO reuniao_convites
        (reuniao_id, usuario_id, membro_id, status, respondido_em)
      VALUES (?, ?, ?, 'aceito', NOW())
      `,
      [reuniaoId, req.usuario.id, req.usuario.membro_id || null]
    );

    if (usuariosConvidados.length > 0) {
      const valores = usuariosConvidados.map((convidado) => [
        reuniaoId,
        convidado.id,
        convidado.membro_id,
        "pendente",
      ]);

      await connection.query(
        `
        INSERT INTO reuniao_convites
          (reuniao_id, usuario_id, membro_id, status)
        VALUES ?
        `,
        [valores]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("Erro ao criar reunião:", err);
    return res.status(500).json({ erro: "Erro ao criar reunião" });
  } finally {
    connection.release();
  }

  await registrarAuditoria({
    usuario: req.usuario,
    req,
    acao: "reuniao.criar",
    entidade: "reuniao",
    entidadeId: reuniaoId,
    dadosDepois: {
      titulo,
      convidados,
    },
  });

  const reuniao = {
    id: reuniaoId,
    titulo,
    status: "aberta",
    criado_por_usuario_id: req.usuario.id,
    criador_nome: req.usuario.nome,
    minha_situacao: "organizador",
    total_convidados: convidados.length + 1,
    participantes_ativos: 0,
  };

  const destinatarios = [req.usuario.id, ...convidados];
  emitirAtualizacao(req, destinatarios, "reunioesAtualizadas", { reuniaoId });
  emitirAtualizacao(req, convidados, "conviteReuniao", {
    reuniaoId,
    titulo,
    criadorNome: req.usuario.nome,
  });

  return res.status(201).json(reuniao);
}

async function detalharReuniao(req, res) {
  const { id } = req.params;

  try {
    const reuniao = await buscarReuniaoParaUsuario(id, req.usuario.id);

    if (!reuniao) {
      return res.status(404).json({ erro: "Reunião não encontrada" });
    }

    const [convidados] = await db.query(
      `
      SELECT
        rc.usuario_id,
        u.nome,
        u.email,
        rc.status,
        rc.convidado_em,
        rc.respondido_em,
        EXISTS (
          SELECT 1
          FROM reuniao_participantes rp
          WHERE rp.reuniao_id = rc.reuniao_id
            AND rp.usuario_id = rc.usuario_id
            AND rp.ativo = 1
        ) AS ativo
      FROM reuniao_convites rc
      JOIN usuarios u ON u.id = rc.usuario_id
      WHERE rc.reuniao_id = ?
      ORDER BY
        ativo DESC,
        CASE rc.status
          WHEN 'aceito' THEN 1
          WHEN 'pendente' THEN 2
          ELSE 3
        END,
        u.nome ASC
      `,
      [id]
    );

    res.json({
      ...reuniao,
      organizador:
        Number(reuniao.criado_por_usuario_id) === Number(req.usuario.id),
      convidados,
    });
  } catch (err) {
    console.error("Erro ao detalhar reunião:", err);
    res.status(500).json({ erro: "Erro ao detalhar reunião" });
  }
}

async function responderConvite(req, res) {
  const { id } = req.params;
  const resposta = req.body?.resposta;

  if (!["aceito", "recusado"].includes(resposta)) {
    return res.status(400).json({ erro: "Resposta de convite inválida" });
  }

  try {
    const reuniao = await buscarReuniaoParaUsuario(id, req.usuario.id);

    if (!reuniao || reuniao.status !== "aberta") {
      return res.status(404).json({ erro: "Reunião não disponível" });
    }

    if (Number(reuniao.criado_por_usuario_id) === Number(req.usuario.id)) {
      return res.status(400).json({
        erro: "O organizador já participa da reunião",
      });
    }

    const [resultado] = await db.query(
      `
      UPDATE reuniao_convites
      SET status = ?,
          respondido_em = NOW()
      WHERE reuniao_id = ?
        AND usuario_id = ?
        AND status = 'pendente'
      `,
      [resposta, id, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(409).json({
        erro: "Este convite já foi respondido",
      });
    }

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: `reuniao.convite_${resposta}`,
      entidade: "reuniao",
      entidadeId: Number(id),
      dadosDepois: { resposta },
    });

    emitirAtualizacao(
      req,
      [req.usuario.id, reuniao.criado_por_usuario_id],
      "reunioesAtualizadas",
      { reuniaoId: Number(id) }
    );

    res.json({
      reuniaoId: Number(id),
      resposta,
    });
  } catch (err) {
    console.error("Erro ao responder convite:", err);
    res.status(500).json({ erro: "Erro ao responder convite" });
  }
}

async function encerrarReuniao(req, res) {
  const { id } = req.params;

  try {
    const [reunioes] = await db.query(
      "SELECT * FROM reunioes WHERE id = ? LIMIT 1",
      [id]
    );
    const reuniao = reunioes[0];

    if (!reuniao) {
      return res.status(404).json({ erro: "Reunião não encontrada" });
    }

    const podeEncerrar =
      Number(reuniao.criado_por_usuario_id) === Number(req.usuario.id);

    if (!podeEncerrar) {
      return res.status(403).json({
        erro: "Somente o organizador pode encerrar esta reunião",
      });
    }

    if (reuniao.status !== "aberta") {
      return res.status(409).json({ erro: "A reunião já foi encerrada" });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(
        `
        UPDATE reunioes
        SET status = 'encerrada',
            encerrada_em = NOW()
        WHERE id = ?
        `,
        [id]
      );
      await connection.query(
        `
        UPDATE reuniao_participantes
        SET ativo = 0,
            saiu_em = NOW()
        WHERE reuniao_id = ?
          AND ativo = 1
        `,
        [id]
      );
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const [convidados] = await db.query(
      "SELECT usuario_id FROM reuniao_convites WHERE reuniao_id = ?",
      [id]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`reuniao_${id}`).emit("reuniaoEncerrada", {
        reuniaoId: Number(id),
      });
    }

    emitirAtualizacao(
      req,
      convidados.map((item) => item.usuario_id),
      "reunioesAtualizadas",
      { reuniaoId: Number(id) }
    );

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "reuniao.encerrar",
      entidade: "reuniao",
      entidadeId: Number(id),
      dadosAntes: { status: reuniao.status },
      dadosDepois: { status: "encerrada" },
    });

    res.json({ reuniaoId: Number(id), status: "encerrada" });
  } catch (err) {
    console.error("Erro ao encerrar reunião:", err);
    res.status(500).json({ erro: "Erro ao encerrar reunião" });
  }
}

module.exports = {
  getIceServers,
  listarReunioes,
  criarReuniao,
  detalharReuniao,
  responderConvite,
  encerrarReuniao,
};
