const db = require("../config/db");
const jwt = require("jsonwebtoken");

function initSocket(io) {
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.disconnect();
      return;
    }

    let usuario;
    try {
      usuario = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.disconnect();
      return;
    }

    console.log(`Usuário conectado: ${usuario.nome}`);

    socket.on("entrarCanal", (canalId) => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });
      socket.join(`canal_${canalId}`);
    });

    socket.on("digitando", (canalId) => {
      socket.to(`canal_${canalId}`).emit("digitando", { nome: usuario.nome });
    });

    socket.on("parouDigitar", (canalId) => {
      socket.to(`canal_${canalId}`).emit("parouDigitar", { nome: usuario.nome });
    });

    socket.on("mensagem", async ({ texto, canalId }) => {
      if (!texto || typeof texto !== "string" || texto.trim() === "") return;
      if (!canalId) return;

      try {
        const [result] = await db.query(
          "INSERT INTO mensagens (usuario_id, canal_id, texto) VALUES (?, ?, ?)",
          [usuario.id, canalId, texto.trim()]
        );

        io.emit("mensagem", {
          id: result.insertId,
          nome: usuario.nome,
          texto: texto.trim(),
          enviado_em: new Date(),
          canalId: canalId,
        });
      } catch (err) {
        console.error("Erro ao salvar mensagem:", err);
      }
    });

    socket.on("mensagemApagada", ({ id, canalId }) => {
      io.to(`canal_${canalId}`).emit("mensagemApagada", id);
    });

    socket.on("disconnect", () => {
      console.log(`Usuário desconectado: ${usuario.nome}`);
    });
  });
}

module.exports = initSocket;