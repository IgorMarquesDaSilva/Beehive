const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { buscarUsuarioPorId } = require("../services/workspaceService");

const {
  usuarioPodeAcessarCanal,
} = require("../controllers/chatController");
const registerMeetingSocket = require("./meetingSocket");

function initSocket(io) {
  const usuariosOnline = new Map();

  async function atualizarStatusBanco(usuarioId, status) {
    try {
      await db.query(
        "UPDATE usuarios SET status = ? WHERE id = ?",
        [status, usuarioId]
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

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

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.disconnect();
      return;
    }

    let usuario;

    try {
      const tokenData = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      usuario = await buscarUsuarioPorId(tokenData.id);

      if (!usuario) {
        socket.disconnect();
        return;
      }
    } catch (err) {
      console.error("Erro ao validar socket:", err);

      socket.disconnect();
      return;
    }

    usuariosOnline.set(socket.id, {
      id: usuario.id,
      nome: usuario.nome,
      cargo: usuario.cargo || "usuario",
      status: "online",
      emVoz: false,
    });

    await atualizarStatusBanco(usuario.id, "online");

    emitirUsuariosOnline();

    console.log(`Usuário conectado: ${usuario.nome}`);

    // ========= STATUS =========

    socket.on("alterarStatus", async (status) => {
      const statusPermitidos = [
        "online",
        "ausente",
        "ocupado",
        "offline",
      ];

      if (!statusPermitidos.includes(status)) return;

      const dados = usuariosOnline.get(socket.id);

      if (!dados) return;

      dados.status = status;

      usuariosOnline.set(socket.id, dados);

      await atualizarStatusBanco(usuario.id, status);

      emitirUsuariosOnline();
    });

    // ========= CANAIS =========

    socket.on("entrarCanal", async (canalId) => {
      if (!canalId) return;

      try {
        const podeAcessar =
          await usuarioPodeAcessarCanal(usuario, canalId);

        if (!podeAcessar) {
          socket.emit("erroCanal", {
            mensagem: "Você não tem acesso a este canal",
          });

          return;
        }

        socket.rooms.forEach((room) => {
          if (
            room !== socket.id &&
            room.startsWith("canal_")
          ) {
            socket.leave(room);
          }
        });

        socket.join(`canal_${canalId}`);
      } catch (err) {
        console.error("Erro ao entrar no canal:", err);
      }
    });

    // ========= DIGITANDO =========

    socket.on("digitando", async (canalId) => {
      if (!canalId) return;

      try {
        const podeAcessar =
          await usuarioPodeAcessarCanal(usuario, canalId);

        if (!podeAcessar) return;

        socket.to(`canal_${canalId}`).emit("digitando", {
          nome: usuario.nome,
        });
      } catch (err) {
        console.error("Erro no evento digitando:", err);
      }
    });

    socket.on("parouDigitar", async (canalId) => {
      if (!canalId) return;

      try {
        const podeAcessar =
          await usuarioPodeAcessarCanal(usuario, canalId);

        if (!podeAcessar) return;

        socket.to(`canal_${canalId}`).emit("parouDigitar", {
          nome: usuario.nome,
        });
      } catch (err) {
        console.error("Erro no evento parouDigitar:", err);
      }
    });

    // ========= MENSAGENS =========

    socket.on(
      "mensagem",
      async ({
        texto,
        canalId,
        arquivo_url = null,
        arquivo_nome = null,
        arquivo_tipo = null,
      }) => {
        if (!canalId) return;

        try {
          const podeAcessar =
            await usuarioPodeAcessarCanal(
              usuario,
              canalId
            );

          if (!podeAcessar) {
            socket.emit("erroCanal", {
              mensagem:
                "Você não tem acesso para enviar mensagens aqui",
            });

            return;
          }

          const textoLimpo =
            typeof texto === "string"
              ? texto.trim()
              : "";

          const temTexto = textoLimpo.length > 0;
          const temArquivo = !!arquivo_url;

          if (!temTexto && !temArquivo) return;

          const [result] = await db.query(
            `
            INSERT INTO mensagens
            (
              usuario_id,
              membro_id,
              canal_id,
              texto,
              arquivo_url,
              arquivo_nome,
              arquivo_tipo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              usuario.id,
              usuario.membro_id || null,
              canalId,
              textoLimpo,
              arquivo_url,
              arquivo_nome,
              arquivo_tipo,
            ]
          );

          if (arquivo_url) {
            await db.query(
              `
              INSERT INTO mensagem_anexos
                (mensagem_id, nome_original, url, mime_type)
              VALUES (?, ?, ?, ?)
              `,
              [
                result.insertId,
                arquivo_nome || "arquivo",
                arquivo_url,
                arquivo_tipo,
              ]
            );
          }

          const mensagemData = {
            id: result.insertId,
            nome: usuario.nome,
            usuarioId: usuario.id,
            texto: textoLimpo,
            enviado_em: new Date(),
            canalId: Number(canalId),
            arquivo_url,
            arquivo_nome,
            arquivo_tipo,
          };
          
          io.to(`canal_${canalId}`).emit(
            "mensagem",
            mensagemData
          );
          
          io.emit(
            "notificacaoMensagem",
            mensagemData
          );
        } catch (err) {
          console.error(
            "Erro ao salvar mensagem:",
            err
          );
        }
      }
    );

    socket.on(
      "mensagemApagada",
      ({ id, canalId }) => {
        if (!id || !canalId) return;

        io.to(`canal_${canalId}`).emit(
          "mensagemApagada",
          id
        );
      }
    );

    registerMeetingSocket({
      io,
      socket,
      usuario,
      usuariosOnline,
      emitirUsuariosOnline,
    });

    // Reuniões e WebRTC são registrados em meetingSocket.js.

    // ========= DESCONECTAR =========

    socket.on("disconnect", async () => {
      console.log(
        `Usuário desconectado: ${usuario.nome}`
      );

      try {
        await socket.data.sairDaReuniaoAtual?.();
      } catch (err) {
        console.error("Erro ao limpar reunião:", err);
      }

      await atualizarStatusBanco(
        usuario.id,
        "offline"
      );

      usuariosOnline.delete(socket.id);
      emitirUsuariosOnline();
    });
  });
}

module.exports = initSocket;
