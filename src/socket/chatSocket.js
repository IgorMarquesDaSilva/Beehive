const db = require("../config/db");
const jwt = require("jsonwebtoken");

function initSocket(io) {
  // armazena usuários em chamadas privadas
  const chamadasPrivadas = {};

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
        if (room !== socket.id && !room.startsWith("voz_")) socket.leave(room);
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

    // ========== VOZ EM CANAL ==========
    socket.on("entrarVoz", async (canalId) => {
      try {
        await db.query(
          "INSERT IGNORE INTO salas_voz (canal_id, usuario_id) VALUES (?, ?)",
          [canalId, usuario.id]
        );

        socket.join(`voz_${canalId}`);

        // avisa todos no canal de voz que alguém entrou
        socket.to(`voz_${canalId}`).emit("usuarioEntroupVoz", {
          socketId: socket.id,
          nome: usuario.nome,
          usuarioId: usuario.id,
        });

        // busca quem já está na sala
        const [membros] = await db.query(
          `SELECT u.id, u.nome FROM salas_voz sv
           JOIN usuarios u ON sv.usuario_id = u.id
           WHERE sv.canal_id = ? AND sv.usuario_id != ?`,
          [canalId, usuario.id]
        );

        socket.emit("membrosVoz", membros);
        io.to(`canal_${canalId}`).emit("atualizarVoz", { canalId });
      } catch (err) {
        console.error("Erro ao entrar na voz:", err);
      }
    });

    socket.on("sairVoz", async (canalId) => {
      try {
        await db.query(
          "DELETE FROM salas_voz WHERE canal_id = ? AND usuario_id = ?",
          [canalId, usuario.id]
        );

        socket.leave(`voz_${canalId}`);
        io.to(`voz_${canalId}`).emit("usuarioSaiuVoz", {
          socketId: socket.id,
          nome: usuario.nome,
          usuarioId: usuario.id,
        });

        io.to(`canal_${canalId}`).emit("atualizarVoz", { canalId });
      } catch (err) {
        console.error("Erro ao sair da voz:", err);
      }
    });

    // ========== WEBRTC SINALIZAÇÃO ==========
    socket.on("offer", ({ offer, para }) => {
      io.to(para).emit("offer", { offer, de: socket.id, nome: usuario.nome });
    });

    socket.on("answer", ({ answer, para }) => {
      io.to(para).emit("answer", { answer, de: socket.id });
    });

    socket.on("iceCandidate", ({ candidate, para }) => {
      io.to(para).emit("iceCandidate", { candidate, de: socket.id });
    });

    // ========== CHAMADA PRIVADA ==========
    socket.on("chamarUsuario", ({ paraSocketId, nome }) => {
      io.to(paraSocketId).emit("chamadaRecebida", {
        de: socket.id,
        nome: usuario.nome,
      });
    });

    socket.on("aceitarChamada", ({ paraSocketId }) => {
      io.to(paraSocketId).emit("chamadaAceita", { de: socket.id });
    });

    socket.on("recusarChamada", ({ paraSocketId }) => {
      io.to(paraSocketId).emit("chamadaRecusada", { de: socket.id });
    });

    socket.on("encerrarChamada", ({ paraSocketId }) => {
      io.to(paraSocketId).emit("chamadaEncerrada");
    });

    socket.on("disconnect", async () => {
      console.log(`Usuário desconectado: ${usuario.nome}`);
      try {
        await db.query(
          "DELETE FROM salas_voz WHERE usuario_id = ?",
          [usuario.id]
        );
        io.emit("usuarioSaiuVoz", { socketId: socket.id, usuarioId: usuario.id });
      } catch (err) {
        console.error("Erro ao limpar voz:", err);
      }
    });
  });
}

module.exports = initSocket;