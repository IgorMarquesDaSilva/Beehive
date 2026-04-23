const express = require("express");
const router = express.Router();
const { getCanais, getMensagens, criarCanal, apagarMensagem } = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/canais", authMiddleware, getCanais);
router.get("/mensagens/:canalId", authMiddleware, getMensagens);
router.post("/canais", authMiddleware, criarCanal);
router.delete("/mensagens/:id", authMiddleware, apagarMensagem);

module.exports = router;