const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getIceServers,
  listarReunioes,
  criarReuniao,
  detalharReuniao,
  responderConvite,
  encerrarReuniao,
} = require("../controllers/meetingController");

const router = express.Router();

router.use(authMiddleware);

router.get("/ice-servers", getIceServers);
router.get("/", listarReunioes);
router.post("/", criarReuniao);
router.get("/:id", detalharReuniao);
router.post("/:id/resposta", responderConvite);
router.post("/:id/encerrar", encerrarReuniao);

module.exports = router;
