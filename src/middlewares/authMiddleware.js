const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);

    const [usuarios] = await db.query(
      "SELECT id, nome, email, cargo FROM usuarios WHERE id = ?",
      [dados.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    req.usuario = usuarios[0];

    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" });
  }
}

module.exports = authMiddleware;