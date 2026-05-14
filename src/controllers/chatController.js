const db = require("../config/db");
const { registrarAuditoria } = require("../services/auditService");
const {
  atualizarCargoDoUsuario,
  getMembroIdPorUsuario,
  listarUsuariosComCargo,
} = require("../services/workspaceService");

function usuarioEhAdminOuModerador(usuario) {
  return usuario?.cargo === "admin" || usuario?.cargo === "moderador";
}

function usuarioEhAdmin(usuario) {
  return usuario?.cargo === "admin";
}

async function usuarioPodeAcessarCanal(usuario, canalId) {
  if (usuarioEhAdminOuModerador(usuario)) return true;

  const [canais] = await db.query(
    "SELECT id, privado FROM canais WHERE id = ?",
    [canalId]
  );

  if (canais.length === 0) return false;
  if (!canais[0].privado) return true;

  const [membros] = await db.query(
    `
    SELECT id
    FROM canal_membros
    WHERE canal_id = ?
      AND (
        usuario_id = ?
        OR (membro_id IS NOT NULL AND membro_id = ?)
      )
    `,
    [canalId, usuario.id, usuario.membro_id || 0]
  );

  return membros.length > 0;
}

async function getCanais(req, res) {
  try {
    let canais;

    if (usuarioEhAdminOuModerador(req.usuario)) {
      const [results] = await db.query("SELECT * FROM canais ORDER BY nome ASC");
      canais = results;
    } else {
      const [results] = await db.query(
        `
        SELECT DISTINCT c.*
        FROM canais c
        LEFT JOIN canal_membros cm
          ON cm.canal_id = c.id AND cm.usuario_id = ?
        WHERE c.privado = 0 OR cm.usuario_id IS NOT NULL
        ORDER BY c.nome ASC
        `,
        [req.usuario.id]
      );

      canais = results;
    }

    res.json(canais);
  } catch (err) {
    console.error("Erro ao buscar canais:", err);
    res.status(500).json({ erro: "Erro ao buscar canais" });
  }
}

async function getMensagens(req, res) {
  const { canalId } = req.params;

  try {
    const podeAcessar = await usuarioPodeAcessarCanal(req.usuario, canalId);

    if (!podeAcessar) {
      return res.status(403).json({
        erro: "Você não tem acesso a este canal",
      });
    }

    const [mensagens] = await db.query(
      `
      SELECT *
      FROM (
        SELECT
          m.id,
          m.texto,
          m.enviado_em,
          m.usuario_id,
          m.arquivo_url,
          m.arquivo_nome,
          m.arquivo_tipo,
          u.nome
        FROM mensagens m
        JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.canal_id = ?
          AND m.apagada_em IS NULL
        ORDER BY m.enviado_em DESC, m.id DESC
        LIMIT 100
      ) ultimas_mensagens
      ORDER BY enviado_em ASC, id ASC
      `,
      [canalId]
    );

    res.json(mensagens);
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err);
    res.status(500).json({ erro: "Erro ao buscar mensagens" });
  }
}

async function criarCanal(req, res) {
  const { nome, descricao, privado = false, membros = [] } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({
      erro: "Nome do canal é obrigatório",
    });
  }

  try {
    const nomeLimpo = nome.trim().toLowerCase();
    const privadoValor = privado ? 1 : 0;

    const [result] = await db.query(
      `
      INSERT INTO canais
        (workspace_id, nome, descricao, tipo, privado, criado_por_membro_id)
      VALUES (?, ?, ?, 'texto', ?, ?)
      `,
      [
        req.usuario.workspace_id || null,
        nomeLimpo,
        descricao || "",
        privadoValor,
        req.usuario.membro_id || null,
      ]
    );

    const canalId = result.insertId;

    if (privadoValor && Array.isArray(membros)) {
      for (const usuarioId of membros) {
        const membroId = await getMembroIdPorUsuario(usuarioId);

        await db.query(
          `
          INSERT IGNORE INTO canal_membros
            (canal_id, usuario_id, membro_id)
          VALUES (?, ?, ?)
          `,
          [canalId, usuarioId, membroId]
        );
      }
    }

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "canal.criar",
      entidade: "canal",
      entidadeId: canalId,
      dadosDepois: {
        nome: nomeLimpo,
        descricao: descricao || "",
        privado: privadoValor,
      },
    });

    res.json({
      id: canalId,
      nome: nomeLimpo,
      descricao: descricao || "",
      privado: privadoValor,
    });
  } catch (err) {
    console.error("Erro ao criar canal:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        erro: "Canal já existe",
      });
    }

    res.status(500).json({
      erro: "Erro ao criar canal",
    });
  }
}

async function atualizarCanal(req, res) {
  const { id } = req.params;
  const { nome, descricao, privado } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({
      erro: "Nome do canal é obrigatório",
    });
  }

  try {
    const [canais] = await db.query("SELECT * FROM canais WHERE id = ?", [id]);

    if (canais.length === 0) {
      return res.status(404).json({
        erro: "Canal não encontrado",
      });
    }

    if (canais[0].nome === "geral") {
      return res.status(400).json({
        erro: "O canal geral não pode ser editado",
      });
    }

    const nomeLimpo = nome.trim().toLowerCase();
    const privadoValor = privado ? 1 : 0;

    await db.query(
      "UPDATE canais SET nome = ?, descricao = ?, privado = ? WHERE id = ?",
      [nomeLimpo, descricao || "", privadoValor, id]
    );

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "canal.atualizar",
      entidade: "canal",
      entidadeId: Number(id),
      dadosAntes: canais[0],
      dadosDepois: {
        id: Number(id),
        nome: nomeLimpo,
        descricao: descricao || "",
        privado: privadoValor,
      },
    });

    res.json({
      mensagem: "Canal atualizado com sucesso",
      id: Number(id),
      nome: nomeLimpo,
      descricao: descricao || "",
      privado: privadoValor,
    });
  } catch (err) {
    console.error("Erro ao atualizar canal:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        erro: "Já existe um canal com esse nome",
      });
    }

    res.status(500).json({
      erro: "Erro ao atualizar canal",
    });
  }
}

async function apagarCanal(req, res) {
  const { id } = req.params;

  try {
    const [canais] = await db.query("SELECT * FROM canais WHERE id = ?", [id]);

    if (canais.length === 0) {
      return res.status(404).json({
        erro: "Canal não encontrado",
      });
    }

    if (canais[0].nome === "geral") {
      return res.status(400).json({
        erro: "O canal geral não pode ser apagado",
      });
    }

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "canal.apagar",
      entidade: "canal",
      entidadeId: Number(id),
      dadosAntes: canais[0],
    });

    await db.query("DELETE FROM canal_membros WHERE canal_id = ?", [id]);
    await db.query("DELETE FROM salas_voz WHERE canal_id = ?", [id]);
    await db.query("DELETE FROM mensagens WHERE canal_id = ?", [id]);
    await db.query("DELETE FROM canais WHERE id = ?", [id]);

    res.json({
      mensagem: "Canal apagado com sucesso",
      id: Number(id),
    });
  } catch (err) {
    console.error("Erro ao apagar canal:", err);
    res.status(500).json({
      erro: "Erro ao apagar canal",
    });
  }
}

async function apagarMensagem(req, res) {
  const { id } = req.params;

  try {
    const [results] = await db.query("SELECT * FROM mensagens WHERE id = ?", [
      id,
    ]);

    if (results.length === 0) {
      return res.status(404).json({
        erro: "Mensagem não encontrada",
      });
    }

    const mensagem = results[0];

    if (
      Number(mensagem.usuario_id) !== Number(req.usuario.id) &&
      !usuarioEhAdminOuModerador(req.usuario)
    ) {
      return res.status(403).json({
        erro: "Você não pode apagar essa mensagem",
      });
    }

    await db.query("UPDATE mensagens SET apagada_em = NOW() WHERE id = ?", [
      id,
    ]);

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "mensagem.apagar",
      entidade: "mensagem",
      entidadeId: Number(id),
      dadosAntes: mensagem,
    });

    res.json({
      mensagem: "Mensagem apagada",
      id: Number(id),
      canalId: mensagem.canal_id,
    });
  } catch (err) {
    console.error("Erro ao apagar mensagem:", err);
    res.status(500).json({
      erro: "Erro ao apagar mensagem",
    });
  }
}

async function getUsuarios(req, res) {
  try {
    const usuarios = await listarUsuariosComCargo();

    res.json(usuarios);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({
      erro: "Erro ao buscar usuários",
    });
  }
}

async function atualizarCargoUsuario(req, res) {
  const { id } = req.params;
  const { cargo } = req.body;

  const cargosPermitidos = ["usuario", "moderador", "admin"];

  if (!usuarioEhAdmin(req.usuario)) {
    return res.status(403).json({
      erro: "Apenas administradores podem alterar cargos",
    });
  }

  if (!cargosPermitidos.includes(cargo)) {
    return res.status(400).json({
      erro: "Cargo inválido",
    });
  }

  if (Number(id) === Number(req.usuario.id) && cargo !== "admin") {
    return res.status(400).json({
      erro: "Você não pode remover seu próprio cargo de administrador",
    });
  }

  try {
    const [usuarios] = await db.query("SELECT id FROM usuarios WHERE id = ?", [
      id,
    ]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado",
      });
    }

    const [antes] = await db.query(
      "SELECT id, nome, email, cargo FROM usuarios WHERE id = ?",
      [id]
    );

    await atualizarCargoDoUsuario(id, cargo);

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "usuario.alterar_cargo",
      entidade: "usuario",
      entidadeId: Number(id),
      dadosAntes: antes[0] || null,
      dadosDepois: {
        id: Number(id),
        cargo,
      },
    });

    res.json({
      mensagem: "Cargo atualizado com sucesso",
      usuarioId: Number(id),
      cargo,
    });
  } catch (err) {
    console.error("Erro ao atualizar cargo:", err);
    res.status(500).json({
      erro: "Erro ao atualizar cargo",
    });
  }
}

async function getMembrosVoz(req, res) {
  const { canalId } = req.params;

  try {
    const podeAcessar = await usuarioPodeAcessarCanal(req.usuario, canalId);

    if (!podeAcessar) {
      return res.status(403).json({
        erro: "Você não tem acesso a este canal de voz",
      });
    }

    const [membros] = await db.query(
      `
      SELECT u.id, u.nome
      FROM salas_voz sv
      JOIN usuarios u ON sv.usuario_id = u.id
      WHERE sv.canal_id = ?
      `,
      [canalId]
    );

    res.json(membros);
  } catch (err) {
    console.error("Erro ao buscar membros da voz:", err);
    res.status(500).json({
      erro: "Erro ao buscar membros da voz",
    });
  }
}

async function getMembrosCanal(req, res) {
  const { canalId } = req.params;

  try {
    const [membros] = await db.query(
      `
      SELECT
        u.id,
        u.nome,
        u.email,
        COALESCE(p.nome, u.cargo, 'usuario') AS cargo
      FROM canal_membros cm
      JOIN usuarios u ON cm.usuario_id = u.id
      LEFT JOIN workspace_membros wm ON wm.id = cm.membro_id
      LEFT JOIN papeis p ON p.id = wm.papel_id
      WHERE cm.canal_id = ?
      ORDER BY u.nome ASC
      `,
      [canalId]
    );

    res.json(membros);
  } catch (err) {
    console.error("Erro ao buscar membros do canal:", err);
    res.status(500).json({
      erro: "Erro ao buscar membros do canal",
    });
  }
}

async function adicionarMembroCanal(req, res) {
  const { canalId } = req.params;
  const { usuarioId } = req.body;

  if (!usuarioId) {
    return res.status(400).json({
      erro: "Usuário é obrigatório",
    });
  }

  try {
    const membroId = await getMembroIdPorUsuario(usuarioId);

    await db.query(
      `
      INSERT IGNORE INTO canal_membros
        (canal_id, usuario_id, membro_id)
      VALUES (?, ?, ?)
      `,
      [canalId, usuarioId, membroId]
    );

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "canal_membro.adicionar",
      entidade: "canal_membro",
      entidadeId: Number(canalId),
      dadosDepois: {
        canalId: Number(canalId),
        usuarioId: Number(usuarioId),
        membroId,
      },
    });

    res.json({
      mensagem: "Usuário adicionado ao canal",
      canalId: Number(canalId),
      usuarioId: Number(usuarioId),
    });
  } catch (err) {
    console.error("Erro ao adicionar membro ao canal:", err);
    res.status(500).json({
      erro: "Erro ao adicionar membro ao canal",
    });
  }
}

async function removerMembroCanal(req, res) {
  const { canalId, usuarioId } = req.params;

  try {
    await db.query(
      "DELETE FROM canal_membros WHERE canal_id = ? AND usuario_id = ?",
      [canalId, usuarioId]
    );

    await registrarAuditoria({
      usuario: req.usuario,
      req,
      acao: "canal_membro.remover",
      entidade: "canal_membro",
      entidadeId: Number(canalId),
      dadosAntes: {
        canalId: Number(canalId),
        usuarioId: Number(usuarioId),
      },
    });

    res.json({
      mensagem: "Usuário removido do canal",
      canalId: Number(canalId),
      usuarioId: Number(usuarioId),
    });
  } catch (err) {
    console.error("Erro ao remover membro do canal:", err);
    res.status(500).json({
      erro: "Erro ao remover membro do canal",
    });
  }
}

module.exports = {
  getCanais,
  getMensagens,
  criarCanal,
  atualizarCanal,
  apagarCanal,
  apagarMensagem,
  getUsuarios,
  atualizarCargoUsuario,
  getMembrosVoz,
  getMembrosCanal,
  adicionarMembroCanal,
  removerMembroCanal,
  usuarioPodeAcessarCanal,
};
