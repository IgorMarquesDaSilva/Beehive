const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados;
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido" });
  }
}

module.exports = authMiddleware;