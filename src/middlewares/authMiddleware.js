const jwt = require("jsonwebtoken");
const { buscarUsuarioPorId } = require("../services/workspaceService");

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await buscarUsuarioPorId(dados.id);

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    req.usuario = usuario;

    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" });
  }
}

module.exports = authMiddleware;
