const express = require("express");
const router = express.Router();
const { register, login, logout, getPerfil, atualizarPerfil } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/perfil", authMiddleware, getPerfil);
router.put("/perfil", authMiddleware, atualizarPerfil);

router.get("/token", authMiddleware, (req, res) => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: req.usuario.id, nome: req.usuario.nome },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token });
});

module.exports = router;