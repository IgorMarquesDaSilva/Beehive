const db = require("../config/db");
const jwt = require("jsonwebtoken");

function initSocket(io) {
  const usuariosOnline = new Map();

  function emitirUsuariosOnline() {
    const lista = Array.from(usuariosOnline.values());

    const usuariosUnicos = [];

    lista.forEach((usuario) => {
      const jaExiste = usuariosUnicos.some(
        (u) => Number(u.id) === Number(usuario.id)
      );

      if (!jaExiste) {
        usuariosUnicos.push(usuario);
      }
    });

    io.emit("usuariosOnline", usuariosUnicos);
  }

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.disconnect();
      return;
    }

    let usuario;

    try {
      usuario = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      socket.disconnect();
      return;
    }

    usuariosOnline.set(socket.id, {
      id: usuario.id,
      nome: usuario.nome,
      emVoz: false,
    });

    emitirUsuariosOnline();

    console.log(`Usuário conectado: ${usuario.nome}`);

    socket.on("entrarCanal", (canalId) => {
      if (!canalId) return;

      socket.rooms.forEach((room) => {
        if (room !== socket.id && room.startsWith("canal_")) {
          socket.leave(room);
        }
      });

      socket.join(`canal_${canalId}`);
    });

    socket.on("digitando", (canalId) => {
      if (!canalId) return;

      socket.to(`canal_${canalId}`).emit("digitando", {
        nome: usuario.nome,
      });
    });

    socket.on("parouDigitar", (canalId) => {
      if (!canalId) return;

      socket.to(`canal_${canalId}`).emit("parouDigitar", {
        nome: usuario.nome,
      });
    });

    socket.on("mensagem", async ({ texto, canalId }) => {
      if (!canalId) return;
      if (!texto || typeof texto !== "string") return;

      const textoLimpo = texto.trim();

      if (textoLimpo === "") return;
      if (textoLimpo.length > 2000) return;

      try {
        const [result] = await db.query(
          "INSERT INTO mensagens (usuario_id, canal_id, texto) VALUES (?, ?, ?)",
          [usuario.id, canalId, textoLimpo]
        );

        io.to(`canal_${canalId}`).emit("mensagem", {
          id: result.insertId,
          nome: usuario.nome,
          usuarioId: usuario.id,
          texto: textoLimpo,
          enviado_em: new Date(),
          canalId: Number(canalId),
        });
      } catch (err) {
        console.error("Erro ao salvar mensagem:", err);
      }
    });

    socket.on("mensagemApagada", ({ id, canalId }) => {
      if (!id || !canalId) return;

      io.to(`canal_${canalId}`).emit("mensagemApagada", id);
    });

    // ========== VOZ EM CANAL ==========

    socket.on("entrarVoz", async (canalId) => {
      if (!canalId) return;

      try {
        await db.query("DELETE FROM salas_voz WHERE usuario_id = ?", [
          usuario.id,
        ]);

        await db.query(
          "INSERT IGNORE INTO salas_voz (canal_id, usuario_id) VALUES (?, ?)",
          [canalId, usuario.id]
        );

        socket.rooms.forEach((room) => {
          if (room !== socket.id && room.startsWith("voz_")) {
            socket.leave(room);
          }
        });

        socket.join(`voz_${canalId}`);

        const dadosOnline = usuariosOnline.get(socket.id);

        if (dadosOnline) {
          dadosOnline.emVoz = true;
          usuariosOnline.set(socket.id, dadosOnline);
        }

        emitirUsuariosOnline();

        const membros = [];
        const socketsNaSala = await io.in(`voz_${canalId}`).fetchSockets();

        socketsNaSala.forEach((s) => {
          const dadosUsuario = usuariosOnline.get(s.id);

          if (dadosUsuario && s.id !== socket.id) {
            membros.push({
              socketId: s.id,
              usuarioId: dadosUsuario.id,
              nome: dadosUsuario.nome,
            });
          }
        });

        socket.emit("membrosVoz", membros);

        socket.to(`voz_${canalId}`).emit("usuarioEntrouVoz", {
          socketId: socket.id,
          usuarioId: usuario.id,
          nome: usuario.nome,
        });

        io.to(`canal_${canalId}`).emit("atualizarVoz", {
          canalId: Number(canalId),
        });
      } catch (err) {
        console.error("Erro ao entrar na voz:", err);
      }
    });

    socket.on("sairVoz", async (canalId) => {
      if (!canalId) return;

      try {
        await db.query(
          "DELETE FROM salas_voz WHERE canal_id = ? AND usuario_id = ?",
          [canalId, usuario.id]
        );

        socket.leave(`voz_${canalId}`);

        const dadosOnline = usuariosOnline.get(socket.id);

        if (dadosOnline) {
          dadosOnline.emVoz = false;
          usuariosOnline.set(socket.id, dadosOnline);
        }

        emitirUsuariosOnline();

        io.to(`voz_${canalId}`).emit("usuarioSaiuVoz", {
          socketId: socket.id,
          usuarioId: usuario.id,
          nome: usuario.nome,
        });

        io.to(`canal_${canalId}`).emit("atualizarVoz", {
          canalId: Number(canalId),
        });
      } catch (err) {
        console.error("Erro ao sair da voz:", err);
      }
    });

    // ========== WEBRTC SINALIZAÇÃO ==========

    socket.on("offer", ({ offer, para }) => {
      if (!offer || !para) return;

      io.to(para).emit("offer", {
        offer,
        de: socket.id,
        nome: usuario.nome,
      });
    });

    socket.on("answer", ({ answer, para }) => {
      if (!answer || !para) return;

      io.to(para).emit("answer", {
        answer,
        de: socket.id,
      });
    });

    socket.on("iceCandidate", ({ candidate, para }) => {
      if (!candidate || !para) return;

      io.to(para).emit("iceCandidate", {
        candidate,
        de: socket.id,
      });
    });

    socket.on("disconnect", async () => {
      console.log(`Usuário desconectado: ${usuario.nome}`);

      usuariosOnline.delete(socket.id);
      emitirUsuariosOnline();

      try {
        await db.query("DELETE FROM salas_voz WHERE usuario_id = ?", [
          usuario.id,
        ]);

        io.emit("usuarioSaiuVoz", {
          socketId: socket.id,
          usuarioId: usuario.id,
          nome: usuario.nome,
        });

        io.emit("atualizarVoz", {});
      } catch (err) {
        console.error("Erro ao limpar voz:", err);
      }
    });
  });
}

module.exports = initSocket;