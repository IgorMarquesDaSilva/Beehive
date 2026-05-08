function adminMiddleware(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  const cargosPermitidos = ["admin", "moderador"];

  if (!cargosPermitidos.includes(req.usuario.cargo)) {
    return res.status(403).json({
      erro: "Você não tem permissão para fazer isso",
    });
  }

  next();
}

module.exports = adminMiddleware;