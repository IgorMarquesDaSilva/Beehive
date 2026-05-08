const express = require("express");
const multer = require("multer");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");

const router = express.Router();

const {
  getCanais,
  getMensagens,
  criarCanal,
  apagarMensagem,
  getUsuarios,
  getMembrosVoz,
  apagarCanal,
} = require("../controllers/chatController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "beehive",
    resource_type: "auto",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "pdf",
      "txt",
      "doc",
      "docx",
      "xls",
      "xlsx",
    ],
    public_id: `${Date.now()}-${file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_.]/g, "")}`,
  }),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get("/canais", authMiddleware, getCanais);
router.get("/mensagens/:canalId", authMiddleware, getMensagens);

router.post("/canais", authMiddleware, adminMiddleware, criarCanal);
router.delete("/canais/:id", authMiddleware, adminMiddleware, apagarCanal);

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
    url: req.file.path,
    tipo: req.file.mimetype,
    tamanho: req.file.size,
  });
});

module.exports = router;