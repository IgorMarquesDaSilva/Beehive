const db = require("../config/db");
const {
  usuarioPodeEntrarReuniao,
} = require("../services/meetingService");

function registerMeetingSocket({
  io,
  socket,
  usuario,
  usuariosOnline,
  emitirUsuariosOnline,
}) {
  socket.join(`usuario_${usuario.id}`);

  async function emitirAtualizacaoReuniao(reuniaoId) {
    const [convidados] = await db.query(
      "SELECT usuario_id FROM reuniao_convites WHERE reuniao_id = ?",
      [reuniaoId]
    );

    convidados.forEach(({ usuario_id: usuarioId }) => {
      io.to(`usuario_${usuarioId}`).emit("reunioesAtualizadas", {
        reuniaoId: Number(reuniaoId),
      });
    });
  }

  async function sairDaReuniaoAtual() {
    const reuniaoId = socket.data.reuniaoId;
    if (!reuniaoId) return;

    await db.query(
      `
      UPDATE reuniao_participantes
      SET saiu_em = NOW(),
          ativo = 0
      WHERE socket_id = ?
        AND reuniao_id = ?
        AND ativo = 1
      `,
      [socket.id, reuniaoId]
    );

    socket.leave(`reuniao_${reuniaoId}`);
    socket.data.reuniaoId = null;
    socket.data.mutadoReuniao = false;

    const dadosOnline = usuariosOnline.get(socket.id);
    if (dadosOnline) {
      dadosOnline.emVoz = false;
      usuariosOnline.set(socket.id, dadosOnline);
    }

    socket.to(`reuniao_${reuniaoId}`).emit(
      "participanteSaiuReuniao",
      {
        reuniaoId: Number(reuniaoId),
        socketId: socket.id,
        usuarioId: usuario.id,
        nome: usuario.nome,
      }
    );

    emitirUsuariosOnline();
    await emitirAtualizacaoReuniao(reuniaoId);
  }

  socket.data.sairDaReuniaoAtual = sairDaReuniaoAtual;

  socket.on("entrarReuniao", async (reuniaoId) => {
    if (!reuniaoId) return;

    try {
      const acesso = await usuarioPodeEntrarReuniao(usuario, reuniaoId);

      if (!acesso.permitido) {
        socket.emit("erroReuniao", {
          mensagem:
            acesso.reuniao?.convite_status === "pendente"
              ? "Aceite o convite antes de entrar"
              : "Você não tem acesso a esta reunião",
        });
        return;
      }

      if (socket.data.reuniaoId) {
        await sairDaReuniaoAtual();
      }

      await db.query(
        `
        UPDATE reuniao_participantes
        SET saiu_em = NOW(),
            ativo = 0
        WHERE usuario_id = ?
          AND ativo = 1
        `,
        [usuario.id]
      );

      socket.join(`reuniao_${reuniaoId}`);
      socket.data.reuniaoId = Number(reuniaoId);
      socket.data.mutadoReuniao = false;

      await db.query(
        `
        INSERT INTO reuniao_participantes
          (
            reuniao_id,
            usuario_id,
            membro_id,
            socket_id,
            entrou_em,
            mutado,
            ativo
          )
        VALUES (?, ?, ?, ?, NOW(), 0, 1)
        `,
        [
          reuniaoId,
          usuario.id,
          usuario.membro_id || null,
          socket.id,
        ]
      );

      const dadosOnline = usuariosOnline.get(socket.id);
      if (dadosOnline) {
        dadosOnline.emVoz = true;
        usuariosOnline.set(socket.id, dadosOnline);
      }

      const socketsNaSala = await io
        .in(`reuniao_${reuniaoId}`)
        .fetchSockets();
      const membros = [];

      socketsNaSala.forEach((socketSala) => {
        const dadosUsuario = usuariosOnline.get(socketSala.id);

        if (dadosUsuario && socketSala.id !== socket.id) {
          membros.push({
            socketId: socketSala.id,
            usuarioId: dadosUsuario.id,
            nome: dadosUsuario.nome,
            mutado: Boolean(socketSala.data.mutadoReuniao),
          });
        }
      });

      socket.emit("entradaReuniaoConfirmada", {
        reuniao: acesso.reuniao,
        membros,
      });

      socket.to(`reuniao_${reuniaoId}`).emit(
        "participanteEntrouReuniao",
        {
          reuniaoId: Number(reuniaoId),
          socketId: socket.id,
          usuarioId: usuario.id,
          nome: usuario.nome,
          mutado: false,
        }
      );

      emitirUsuariosOnline();
      await emitirAtualizacaoReuniao(reuniaoId);
    } catch (err) {
      console.error("Erro ao entrar na reunião:", err);
      socket.emit("erroReuniao", {
        mensagem: "Não foi possível entrar na reunião",
      });
    }
  });

  socket.on("sairReuniao", async () => {
    try {
      await sairDaReuniaoAtual();
    } catch (err) {
      console.error("Erro ao sair da reunião:", err);
    }
  });

  socket.on("alterarMudoReuniao", async (mutado) => {
    const reuniaoId = socket.data.reuniaoId;
    if (!reuniaoId) return;

    const valorMutado = Boolean(mutado);
    socket.data.mutadoReuniao = valorMutado;

    try {
      await db.query(
        `
        UPDATE reuniao_participantes
        SET mutado = ?
        WHERE socket_id = ?
          AND reuniao_id = ?
          AND ativo = 1
        `,
        [valorMutado ? 1 : 0, socket.id, reuniaoId]
      );

      socket.to(`reuniao_${reuniaoId}`).emit(
        "participanteMudoAlterado",
        {
          socketId: socket.id,
          mutado: valorMutado,
        }
      );
    } catch (err) {
      console.error("Erro ao atualizar microfone:", err);
    }
  });

  function podeSinalizarCom(socketDestinoId) {
    const reuniaoId = socket.data.reuniaoId;
    const socketDestino = io.sockets.sockets.get(socketDestinoId);

    return Boolean(
      reuniaoId &&
      socketDestino &&
      socketDestino.rooms.has(`reuniao_${reuniaoId}`)
    );
  }

  socket.on("offerReuniao", ({ offer, para }) => {
    if (!offer || !para || !podeSinalizarCom(para)) return;

    io.to(para).emit("offerReuniao", {
      offer,
      de: socket.id,
      nome: usuario.nome,
    });
  });

  socket.on("answerReuniao", ({ answer, para }) => {
    if (!answer || !para || !podeSinalizarCom(para)) return;

    io.to(para).emit("answerReuniao", {
      answer,
      de: socket.id,
    });
  });

  socket.on("iceCandidateReuniao", ({ candidate, para }) => {
    if (!candidate || !para || !podeSinalizarCom(para)) return;

    io.to(para).emit("iceCandidateReuniao", {
      candidate,
      de: socket.id,
    });
  });
}

module.exports = registerMeetingSocket;
