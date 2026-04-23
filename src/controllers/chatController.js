const db = require("../config/db");

async function getCanais(req, res) {
  try {
    const [canais] = await db.query("SELECT * FROM canais ORDER BY nome ASC");
    res.json(canais);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar canais" });
  }
}

async function getMensagens(req, res) {
  const { canalId } = req.params;

  try {
    const [mensagens] = await db.query(
      `SELECT m.id, m.texto, m.enviado_em, m.usuario_id, u.nome 
       FROM mensagens m 
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.canal_id = ?
       ORDER BY m.enviado_em ASC
       LIMIT 100`,
      [canalId]
    );
    res.json(mensagens);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar mensagens" });
  }
}

async function criarCanal(req, res) {
  const { nome, descricao } = req.body;

  if (!nome || nome.trim() === "") {
    return res.status(400).json({ erro: "Nome do canal é obrigatório" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO canais (nome, descricao) VALUES (?, ?)",
      [nome.trim().toLowerCase(), descricao || ""]
    );
    res.json({ id: result.insertId, nome: nome.trim().toLowerCase(), descricao: descricao || "" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Canal já existe" });
    }
    res.status(500).json({ erro: "Erro ao criar canal" });
  }
}

async function apagarMensagem(req, res) {
  const { id } = req.params;

  try {
    const [results] = await db.query(
      "SELECT * FROM mensagens WHERE id = ?",
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ erro: "Mensagem não encontrada" });
    }

    const mensagem = results[0];

    // só o autor pode apagar
    if (mensagem.usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Você não pode apagar essa mensagem" });
    }

    await db.query("DELETE FROM mensagens WHERE id = ?", [id]);

    res.json({ mensagem: "Mensagem apagada", id: Number(id), canalId: mensagem.canal_id });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao apagar mensagem" });
  }
}

module.exports = { getCanais, getMensagens, criarCanal, apagarMensagem };