const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

document.getElementById("nome-usuario").innerText = usuario.nome;

let canalAtual = null;
let socket = null;
let timeoutDigitando = null;
let usuarios = [];
let notificacoes = {};
let mencoes = {};

async function iniciar() {
  try {
    const res = await fetch("/auth/token", { credentials: "include" });

    if (!res.ok) {
      localStorage.removeItem("usuario");
      window.location.href = "/pages/login.html";
      return;
    }

    const data = await res.json();

    if (!data.token) {
      localStorage.removeItem("usuario");
      window.location.href = "/pages/login.html";
      return;
    }

    socket = io({
      auth: {
        token: data.token,
      },
    });

    window.socket = socket;

    socket.on("connect", () => {
      console.log("Socket conectado:", socket.id);

      if (canalAtual) {
        socket.emit("entrarCanal", canalAtual);
      }
    });
    socket.on("usuariosOnline", (lista) => {
      renderizarUsuariosOnline(lista);
    });

    socket.on("disconnect", () => {
      console.log("Socket desconectado");
    });

    socket.on("connect_error", () => {
      alert("Sua sessão expirou. Faça login novamente.");
      localStorage.removeItem("usuario");
      window.location.href = "/pages/login.html";
    });

    socket.on("mensagem", (data) => {
      if (Number(data.canalId) === Number(canalAtual)) {
        adicionarMensagem(
          data.id,
          data.nome,
          data.texto,
          Number(data.usuarioId) === Number(usuario.id) || data.nome === usuario.nome,
          data.enviado_em
        );
      } else {
        const foiMencionado = verificarMencao(data.texto, usuario.nome);
        adicionarNotificacao(data.canalId, foiMencionado);
      }
    });

    socket.on("mensagemApagada", (id) => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
    });

    socket.on("digitando", (data) => {
      document.getElementById("digitando-texto").innerText = `${data.nome} está digitando...`;
    });

    socket.on("parouDigitar", () => {
      document.getElementById("digitando-texto").innerText = "";
    });

    // ========== EVENTOS DE VOZ ==========

    socket.on("membrosVoz", async (membros) => {
      if (!Array.isArray(membros)) return;

      for (const m of membros) {
        if (!m.socketId) continue;

        adicionarMembroVoz(m.nome, m.socketId);
        await criarPeer(m.socketId, true);
      }

      atualizarBotoesVoz();
    });

    socket.on("usuarioEntrouVoz", async ({ socketId, nome }) => {
      if (!socketId) return;

      adicionarMembroVoz(nome, socketId);

      if (typeof canalVozAtual !== "undefined" && canalVozAtual) {
        await criarPeer(socketId, false);
      }

      atualizarBotoesVoz();
    });

    socket.on("usuarioSaiuVoz", ({ socketId }) => {
      if (!socketId) return;

      removerMembroVoz(socketId);
      removerAudio(socketId);
      atualizarBotoesVoz();
    });

    socket.on("offer", async ({ offer, de }) => {
      if (!localStream) return;

      const peer = await criarPeer(de, false);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        answer,
        para: de,
      });
    });

    socket.on("answer", async ({ answer, de }) => {
      const peer = peers[de];

      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("iceCandidate", async ({ candidate, de }) => {
      const peer = peers[de];

      if (peer && candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("atualizarVoz", async ({ canalId }) => {
      if (canalId) {
        await carregarMembrosVoz(canalId);
      }
    });

    socket.on("chamadaRecebida", ({ de, nome }) => {
      chamadaDeSocketId = de;
      document.getElementById("chamada-nome").innerText = `${nome} está te chamando...`;
      document.getElementById("modal-chamada").style.display = "block";
      document.getElementById("modal-chamada-overlay").style.display = "block";
    });

    socket.on("chamadaAceita", async ({ de }) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream = stream;
        await criarPeer(de, true);
      } catch (err) {
        alert("Não foi possível acessar o microfone.");
        console.error(err);
      }
    });

    socket.on("chamadaRecusada", () => {
      alert("Chamada recusada.");
      chamadaParaSocketId = null;
    });

    socket.on("chamadaEncerrada", () => {
      alert("Chamada encerrada.");
      encerrarConexoesVoz();
    });
  } catch (err) {
    console.error("Erro ao iniciar chat:", err);
    localStorage.removeItem("usuario");
    window.location.href = "/pages/login.html";
  }
}


async function carregarCanais() {
  try {
    const res = await fetch("/chat/canais", { credentials: "include" });

    if (!res.ok) {
      throw new Error("Erro ao carregar canais");
    }

    const canais = await res.json();

    const lista = document.getElementById("lista-canais");
    lista.innerHTML = "";

    canais.forEach((canal) => {
      const div = document.createElement("div");
      div.classList.add("canal-item");
      div.setAttribute("data-canal-id", canal.id);

      const span = document.createElement("span");
      span.classList.add("canal-nome");

      const textoCanal = document.createTextNode(`# ${canal.nome} `);
      span.appendChild(textoCanal);

      const badge = document.createElement("span");
      badge.classList.add("badge");
      badge.id = `badge-${canal.id}`;
      badge.style.display = "none";
      badge.innerText = "●";

      span.appendChild(badge);

      span.onclick = () => entrarCanalTexto(canal.id, canal.nome, div);

      const btnVoz = document.createElement("button");
      btnVoz.classList.add("btn-entrar-voz");
      btnVoz.setAttribute("data-canal-id", canal.id);
      btnVoz.innerText = "🎙️ Entrar";
      btnVoz.onclick = () => entrarVoz(canal.id, canal.nome);

      div.appendChild(span);
      div.appendChild(btnVoz);

      lista.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar canais.");
  }
}
function renderizarUsuariosOnline(lista) {
  const container = document.getElementById("lista-online");
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(lista)) return;

  const usuariosFiltrados = lista.filter((u) => Number(u.id) !== Number(usuario.id));

  usuariosFiltrados.forEach((u) => {
    const div = document.createElement("div");
    div.classList.add("online-member");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.innerText = gerarIniciais(u.nome);

    const info = document.createElement("div");
    info.classList.add("online-member-info");

    const nome = document.createElement("strong");
    nome.innerText = u.nome;

    const status = document.createElement("small");
    status.innerText = u.emVoz ? "Em chamada" : "Online";

    const bolinha = document.createElement("span");
    bolinha.classList.add("online-dot");

    info.appendChild(nome);
    info.appendChild(status);

    div.appendChild(avatar);
    div.appendChild(info);
    div.appendChild(bolinha);

    container.appendChild(div);
  });
}

function gerarIniciais(nome) {
  if (!nome) return "?";

  const partes = nome.trim().split(" ");

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  return `${partes[0].charAt(0)}${partes[partes.length - 1].charAt(0)}`.toUpperCase();
}

async function carregarUsuarios() {
  try {
    const res = await fetch("/chat/usuarios", { credentials: "include" });

    if (!res.ok) {
      throw new Error("Erro ao carregar usuários");
    }

    usuarios = await res.json();
  } catch (err) {
    console.error(err);
    usuarios = [];
  }
}

function adicionarNotificacao(canalId, foiMencionado = false) {
  notificacoes[canalId] = (notificacoes[canalId] || 0) + 1;

  if (foiMencionado) {
    mencoes[canalId] = true;
  }

  const badge = document.getElementById(`badge-${canalId}`);
  if (!badge) return;

  badge.style.display = "inline";

  if (mencoes[canalId]) {
    badge.innerText = "@";
    badge.classList.add("mencao");
  } else {
    badge.innerText = notificacoes[canalId];
    badge.classList.remove("mencao");
  }
}

function limparNotificacao(canalId) {
  notificacoes[canalId] = 0;
  mencoes[canalId] = false;

  const badge = document.getElementById(`badge-${canalId}`);

  if (badge) {
    badge.style.display = "none";
    badge.classList.remove("mencao");
  }
}

function entrarCanalTexto(canalId, nomeCanal, el) {
  canalAtual = canalId;

  document.querySelectorAll(".canal-item").forEach((item) => {
    item.classList.remove("ativo");
  });

  el.closest(".canal-item").classList.add("ativo");

  document.getElementById("canal-ativo").innerText = `# ${nomeCanal}`;
  document.getElementById("chat-mensagens").innerHTML = "";
  document.getElementById("digitando-texto").innerText = "";

  limparNotificacao(canalId);

  if (socket) {
    socket.emit("entrarCanal", canalId);
  }

  carregarMensagens(canalId);
}

async function carregarMensagens(canalId) {
  try {
    const res = await fetch(`/chat/mensagens/${canalId}`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Erro ao carregar mensagens");
    }

    const mensagens = await res.json();

    mensagens.forEach((m) => {
      adicionarMensagem(
        m.id,
        m.nome,
        m.texto,
        Number(m.usuario_id) === Number(usuario.id),
        m.enviado_em
      );
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar mensagens.");
  }
}

function verificarMencao(texto, nomeUsuario) {
  if (!texto || !nomeUsuario) return false;

  return texto.toLowerCase().includes(`@${nomeUsuario.toLowerCase()}`);
}

function criarTextoComMencoes(texto) {
  const fragment = document.createDocumentFragment();
  const partes = texto.split(/(@[\wÀ-ÿ]+)/g);

  partes.forEach((parte) => {
    if (parte.startsWith("@")) {
      const span = document.createElement("span");
      span.classList.add("mencao");
      span.innerText = parte;
      fragment.appendChild(span);
    } else {
      fragment.appendChild(document.createTextNode(parte));
    }
  });

  return fragment;
}

function adicionarMensagem(id, nome, texto, propria = false, enviado_em = null) {
  const div = document.createElement("div");
  div.classList.add("mensagem");
  div.setAttribute("data-id", id);

  if (propria) {
    div.classList.add("propria");
  }

  const hora = enviado_em
    ? new Date(enviado_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

  const autor = document.createElement("span");
  autor.classList.add("autor");
  autor.innerText = nome;

  const horaSpan = document.createElement("span");
  horaSpan.classList.add("hora");
  horaSpan.innerText = ` ${hora}`;

  autor.appendChild(horaSpan);

  const balaoWrapper = document.createElement("div");
  balaoWrapper.classList.add("balao-wrapper");

  const balao = document.createElement("div");
  balao.classList.add("balao");
  balao.appendChild(criarTextoComMencoes(texto));

  balaoWrapper.appendChild(balao);

  if (propria) {
    const btnApagar = document.createElement("button");
    btnApagar.classList.add("btn-apagar");
    btnApagar.innerText = "✕";
    btnApagar.onclick = () => apagarMensagem(id);

    balaoWrapper.appendChild(btnApagar);
  }

  div.appendChild(autor);
  div.appendChild(balaoWrapper);

  const container = document.getElementById("chat-mensagens");
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function apagarMensagem(id) {
  if (!confirm("Apagar essa mensagem?")) return;

  try {
    const res = await fetch(`/chat/mensagens/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok) {
      socket.emit("mensagemApagada", {
        id,
        canalId: canalAtual,
      });
    } else {
      alert(data.erro || "Erro ao apagar mensagem");
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao apagar mensagem.");
  }
}

function enviar() {
  const input = document.getElementById("msg-input");
  const texto = input.value.trim();

  if (!texto) return;

  if (!canalAtual) {
    alert("Selecione um canal antes de enviar!");
    return;
  }

  if (!socket || !socket.connected) {
    alert("Você está desconectado. Recarregue a página.");
    return;
  }

  socket.emit("mensagem", {
    texto,
    canalId: canalAtual,
  });

  socket.emit("parouDigitar", canalAtual);

  input.value = "";
  fecharSugestoes();
}

function mostrarSugestoes(filtro) {
  const lista = document.getElementById("sugestoes-mencao");
  lista.innerHTML = "";

  const filtrados = usuarios.filter((u) => {
    return (
      u.nome.toLowerCase().includes(filtro.toLowerCase()) &&
      u.nome !== usuario.nome
    );
  });

  if (filtrados.length === 0) {
    lista.style.display = "none";
    return;
  }

  filtrados.forEach((u) => {
    const div = document.createElement("div");
    div.classList.add("sugestao-item");
    div.innerText = u.nome;
    div.onclick = () => inserirMencao(u.nome);
    lista.appendChild(div);
  });

  lista.style.display = "block";
}

function fecharSugestoes() {
  const lista = document.getElementById("sugestoes-mencao");

  if (lista) {
    lista.style.display = "none";
  }
}

function inserirMencao(nome) {
  const input = document.getElementById("msg-input");
  const valor = input.value;
  const ultimoArroba = valor.lastIndexOf("@");

  input.value = valor.substring(0, ultimoArroba) + `@${nome} `;
  input.focus();

  fecharSugestoes();
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("msg-input");

  if (!input) return;

  input.addEventListener("input", () => {
    if (!canalAtual || !socket) return;

    socket.emit("digitando", canalAtual);

    clearTimeout(timeoutDigitando);

    timeoutDigitando = setTimeout(() => {
      socket.emit("parouDigitar", canalAtual);
    }, 2000);

    const valor = input.value;
    const ultimoArroba = valor.lastIndexOf("@");

    if (ultimoArroba !== -1) {
      const filtro = valor.substring(ultimoArroba + 1);

      if (!filtro.includes(" ")) {
        mostrarSugestoes(filtro);
        return;
      }
    }

    fecharSugestoes();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharSugestoes();
    }

    if (e.key === "Enter" && !e.shiftKey) {
      enviar();
      e.preventDefault();
    }
  });
});

function abrirModalCanal() {
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("modal-canal").style.display = "block";
  document.getElementById("canal-nome").focus();
  document.getElementById("canal-erro").innerText = "";
  document.getElementById("canal-nome").value = "";
  document.getElementById("canal-descricao").value = "";
}

function fecharModalCanal() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("modal-canal").style.display = "none";
}

async function criarCanal() {
  const nome = document.getElementById("canal-nome").value.trim();
  const descricao = document.getElementById("canal-descricao").value.trim();

  if (!nome) {
    document.getElementById("canal-erro").innerText = "Nome do canal é obrigatório";
    return;
  }

  try {
    const res = await fetch("/chat/canais", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        nome,
        descricao,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      fecharModalCanal();
      carregarCanais();
    } else {
      document.getElementById("canal-erro").innerText =
        data.erro || "Erro ao criar canal";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("canal-erro").innerText = "Erro ao criar canal";
  }
}

function encerrarConexoesVoz() {
  if (typeof localStream !== "undefined" && localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  if (typeof peers !== "undefined" && peers) {
    Object.values(peers).forEach((p) => p.close());
    peers = {};
  }
}

async function logout() {
  await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  localStorage.removeItem("usuario");
  window.location.href = "/pages/login.html";
}

iniciar();
carregarCanais();
carregarUsuarios();