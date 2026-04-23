const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

document.getElementById("nome-usuario").innerText = usuario.nome;

let canalAtual = null;
let socket = null;
let timeoutDigitando = null;

async function iniciar() {
  const res = await fetch("/auth/token", { credentials: "include" });
  const data = await res.json();

  socket = io({ auth: { token: data.token } });

  socket.on("mensagem", (data) => {
    adicionarMensagem(data.nome, data.texto, data.nome === usuario.nome, data.enviado_em);
  });

  socket.on("digitando", (data) => {
    document.getElementById("digitando-texto").innerText = `${data.nome} está digitando...`;
  });

  socket.on("parouDigitar", () => {
    document.getElementById("digitando-texto").innerText = "";
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
    div.innerText = `# ${canal.nome}`;
    div.onclick = (event) => entrarCanal(canal, event);
    lista.appendChild(div);
  });
}

function entrarCanal(canal, event) {
  canalAtual = canal.id;

  document.querySelectorAll(".canal-item").forEach((el) => el.classList.remove("ativo"));
  event.target.classList.add("ativo");

  document.getElementById("canal-ativo").innerText = `# ${canal.nome}`;
  document.getElementById("chat-mensagens").innerHTML = "";
  document.getElementById("digitando-texto").innerText = "";

  socket.emit("entrarCanal", canal.id);
  carregarMensagens(canal.id);
}

async function carregarMensagens(canalId) {
  const res = await fetch(`/chat/mensagens/${canalId}`, { credentials: "include" });
  const mensagens = await res.json();
  mensagens.forEach((m) => adicionarMensagem(m.nome, m.texto, m.nome === usuario.nome, m.enviado_em));
}

function adicionarMensagem(nome, texto, propria = false, enviado_em = null) {
  const div = document.createElement("div");
  div.classList.add("mensagem");
  if (propria) div.classList.add("propria");

  const hora = enviado_em
    ? new Date(enviado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  div.innerHTML = `
    <span class="autor">${nome} <span class="hora">${hora}</span></span>
    <div class="balao">${texto}</div>
  `;

  const container = document.getElementById("chat-mensagens");
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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
  });
});

// modal de criar canal
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