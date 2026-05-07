const express = require("express");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const {
  getCanais,
  getMensagens,
  criarCanal,
  apagarMensagem,
  getUsuarios,
  getMembrosVoz,
} = require("../controllers/chatController");

const authMiddleware = require("../middlewares/authMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/uploads"));
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    const nomeSeguro = file.originalname
      .replace(extensao, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase();

    cb(null, `${Date.now()}-${nomeSeguro}${extensao}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido."));
    }
  },
});

router.get("/canais", authMiddleware, getCanais);
router.get("/mensagens/:canalId", authMiddleware, getMensagens);
router.post("/canais", authMiddleware, criarCanal);
router.delete("/mensagens/:id", authMiddleware, apagarMensagem);
router.get("/usuarios", authMiddleware, getUsuarios);
router.get("/voz/:canalId", authMiddleware, getMembrosVoz);

router.post("/upload", authMiddleware, upload.single("arquivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      erro: "Nenhum arquivo enviado.",
    });
  }

  return res.json({
    nomeOriginal: req.file.originalname,
    nomeArquivo: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    tipo: req.file.mimetype,
    tamanho: req.file.size,
  });
});

module.exports = router;