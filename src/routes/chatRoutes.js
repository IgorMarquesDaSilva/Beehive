const express = require("express");
const router = express.Router();
const { getCanais, getMensagens } = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/canais", authMiddleware, getCanais);
router.get("/mensagens/:canalId", authMiddleware, getMensagens);

module.exports = router;