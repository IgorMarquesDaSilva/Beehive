const db = require("../config/db");

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
    "SELECT id FROM canal_membros WHERE canal_id = ? AND usuario_id = ?",
    [canalId, usuario.id]
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
      ORDER BY m.enviado_em ASC
      LIMIT 100
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
      "INSERT INTO canais (nome, descricao, privado) VALUES (?, ?, ?)",
      [nomeLimpo, descricao || "", privadoValor]
    );

    const canalId = result.insertId;

    if (privadoValor && Array.isArray(membros)) {
      for (const usuarioId of membros) {
        await db.query(
          "INSERT IGNORE INTO canal_membros (canal_id, usuario_id) VALUES (?, ?)",
          [canalId, usuarioId]
        );
      }
    }

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

    await db.query("DELETE FROM mensagens WHERE id = ?", [id]);

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
    const [usuarios] = await db.query(
      "SELECT id, nome, email, cargo FROM usuarios ORDER BY nome ASC"
    );

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

    await db.query("UPDATE usuarios SET cargo = ? WHERE id = ?", [cargo, id]);

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
      SELECT u.id, u.nome, u.email, u.cargo
      FROM canal_membros cm
      JOIN usuarios u ON cm.usuario_id = u.id
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
    await db.query(
      "INSERT IGNORE INTO canal_membros (canal_id, usuario_id) VALUES (?, ?)",
      [canalId, usuarioId]
    );

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