const express = require("express");
const router = express.Router();
const { register, login, logout } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// rota que devolve o token para o socket usar
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