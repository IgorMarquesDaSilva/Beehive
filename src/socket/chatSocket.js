const db = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

    // entra em um canal
    socket.on("entrarCanal", (canalId) => {
      // sai de todos os canais anteriores
      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(`canal_${canalId}`);
      console.log(`${usuario.nome} entrou no canal ${canalId}`);
    });

    // recebe e transmite mensagem
    socket.on("mensagem", async ({ texto, canalId }) => {
      if (!texto || typeof texto !== "string" || texto.trim() === "") return;
      if (!canalId) return;

      try {
        await db.query(
          "INSERT INTO mensagens (usuario_id, canal_id, texto) VALUES (?, ?, ?)",
          [usuario.id, canalId, texto.trim()]
        );

        io.to(`canal_${canalId}`).emit("mensagem", {
          nome: usuario.nome,
          texto: texto.trim(),
          enviado_em: new Date(),
        });
      } catch (err) {
        console.error("Erro ao salvar mensagem:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Usuário desconectado: ${usuario.nome}`);
    });
  });
}

module.exports = initSocket;