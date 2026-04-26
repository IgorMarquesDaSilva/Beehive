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
  const res = await fetch("/auth/token", { credentials: "include" });
  const data = await res.json();

  socket = io({ auth: { token: data.token } });
  window.socket = socket;

  socket.on("mensagem", (data) => {
    if (Number(data.canalId) === Number(canalAtual)) {
      adicionarMensagem(data.id, data.nome, data.texto, data.nome === usuario.nome, data.enviado_em);
    } else {
      const foiMencionado = data.texto.toLowerCase().includes(`@${usuario.nome.toLowerCase()}`);
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
    membros.forEach(async (m) => {
      adicionarMembroVoz(m.nome, m.socketId);
      await criarPeer(m.socketId, true);
    });
    atualizarBotoesVoz();
  });

  socket.on("usuarioEntroupVoz", async ({ socketId, nome }) => {
    adicionarMembroVoz(nome, socketId);
    if (canalVozAtual) {
      await criarPeer(socketId, false);
    }
    atualizarBotoesVoz();
  });

  socket.on("usuarioSaiuVoz", ({ socketId }) => {
    removerMembroVoz(socketId);
    removerAudio(socketId);
    atualizarBotoesVoz();
  });

  socket.on("offer", async ({ offer, de, nome }) => {
    if (!localStream) return;
    const peer = await criarPeer(de, false);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", { answer, para: de });
  });

  socket.on("answer", async ({ answer, de }) => {
    const peer = peers[de];
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("iceCandidate", async ({ candidate, de }) => {
    const peer = peers[de];
    if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate));
  });

  socket.on("atualizarVoz", async ({ canalId }) => {
    await carregarMembrosVoz(canalId);
  });

  socket.on("chamadaRecebida", ({ de, nome }) => {
    chamadaDeSocketId = de;
    document.getElementById("chamada-nome").innerText = `${nome} está te chamando...`;
    document.getElementById("modal-chamada").style.display = "block";
    document.getElementById("modal-chamada-overlay").style.display = "block";
  });

  socket.on("chamadaAceita", async ({ de }) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(async (stream) => {
      localStream = stream;
      await criarPeer(de, true);
    });
  });

  socket.on("chamadaRecusada", () => {
    alert("Chamada recusada.");
    chamadaParaSocketId = null;
  });

  socket.on("chamadaEncerrada", () => {
    alert("Chamada encerrada.");
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    Object.values(peers).forEach((p) => p.close());
    peers = {};
  });
}

async function carregarCanais() {
  const res = await fetch("/chat/canais", { credentials: "include" });
  const canais = await res.json();

  const lista = document.getElementById("lista-canais");
  lista.innerHTML = "";

  canais.forEach((canal) => {
    const div = document.createElement("div");
    div.classList.add("canal-item");
    div.setAttribute("data-canal-id", canal.id);
    div.innerHTML = `
      <span onclick="entrarCanalTexto(${canal.id}, '${canal.nome}', this.parentElement)">
        # ${canal.nome} <span class="badge" id="badge-${canal.id}" style="display:none">●</span>
      </span>
      <button class="btn-entrar-voz" data-canal-id="${canal.id}" onclick="entrarVoz(${canal.id}, '${canal.nome}')">🎙️ Entrar</button>
    `;
    lista.appendChild(div);
  });
}

async function carregarUsuarios() {
  const res = await fetch("/chat/usuarios", { credentials: "include" });
  usuarios = await res.json();
}

function adicionarNotificacao(canalId, foiMencionado = false) {
  notificacoes[canalId] = (notificacoes[canalId] || 0) + 1;
  if (foiMencionado) mencoes[canalId] = true;

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

  document.querySelectorAll(".canal-item").forEach((item) => item.classList.remove("ativo"));
  el.closest(".canal-item").classList.add("ativo");

  document.getElementById("canal-ativo").innerText = `# ${nomeCanal}`;
  document.getElementById("chat-mensagens").innerHTML = "";
  document.getElementById("digitando-texto").innerText = "";

  limparNotificacao(canalId);

  socket.emit("entrarCanal", canalId);
  carregarMensagens(canalId);
}

async function carregarMensagens(canalId) {
  const res = await fetch(`/chat/mensagens/${canalId}`, { credentials: "include" });
  const mensagens = await res.json();
  mensagens.forEach((m) => adicionarMensagem(m.id, m.nome, m.texto, m.usuario_id === usuario.id, m.enviado_em));
}

function formatarTexto(texto) {
  return texto.replace(/@(\w+)/g, '<span class="mencao">@$1</span>');
}

function adicionarMensagem(id, nome, texto, propria = false, enviado_em = null) {
  const div = document.createElement("div");
  div.classList.add("mensagem");
  div.setAttribute("data-id", id);
  if (propria) div.classList.add("propria");

  const hora = enviado_em
    ? new Date(enviado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const btnApagar = propria
    ? `<button class="btn-apagar" onclick="apagarMensagem(${id})">✕</button>`
    : "";

  div.innerHTML = `
    <span class="autor">${nome} <span class="hora">${hora}</span></span>
    <div class="balao-wrapper">
      <div class="balao">${formatarTexto(texto)}</div>
      ${btnApagar}
    </div>
  `;

  const container = document.getElementById("chat-mensagens");
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function apagarMensagem(id) {
  if (!confirm("Apagar essa mensagem?")) return;

  const res = await fetch(`/chat/mensagens/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();

  if (res.ok) {
    socket.emit("mensagemApagada", { id, canalId: canalAtual });
  } else {
    alert(data.erro || "Erro ao apagar mensagem");
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

  socket.emit("mensagem", { texto, canalId: canalAtual });
  socket.emit("parouDigitar", canalAtual);
  input.value = "";
  fecharSugestoes();
}

function mostrarSugestoes(filtro) {
  const lista = document.getElementById("sugestoes-mencao");
  lista.innerHTML = "";

  const filtrados = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(filtro.toLowerCase()) && u.nome !== usuario.nome
  );

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
  document.getElementById("sugestoes-mencao").style.display = "none";
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

  input.addEventListener("input", () => {
    if (!canalAtual) return;

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
    if (e.key === "Escape") fecharSugestoes();
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

  const res = await fetch("/chat/canais", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ nome, descricao }),
  });

  const data = await res.json();

  if (res.ok) {
    fecharModalCanal();
    carregarCanais();
  } else {
    document.getElementById("canal-erro").innerText = data.erro || "Erro ao criar canal";
  }
}

async function logout() {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
  localStorage.removeItem("usuario");
  window.location.href = "/pages/login.html";
}

iniciar();
carregarCanais();
carregarUsuarios();