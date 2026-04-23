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
      `SELECT m.id, m.texto, m.enviado_em, u.nome 
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

module.exports = { getCanais, getMensagens, criarCanal };