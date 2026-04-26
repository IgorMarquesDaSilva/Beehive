const express = require("express");
const router = express.Router();
const { getCanais, getMensagens, criarCanal, apagarMensagem, getUsuarios } = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/canais", authMiddleware, getCanais);
router.get("/mensagens/:canalId", authMiddleware, getMensagens);
router.post("/canais", authMiddleware, criarCanal);
router.delete("/mensagens/:id", authMiddleware, apagarMensagem);
router.get("/usuarios", authMiddleware, getUsuarios);

module.exports = router;