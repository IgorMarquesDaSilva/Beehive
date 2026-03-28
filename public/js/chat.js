const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

document.getElementById("nome-usuario").innerText = usuario.nome;

let canalAtual = null;
let socket = null;

async function iniciar() {
  const res = await fetch("/auth/token", { credentials: "include" });
  const data = await res.json();

  socket = io({ auth: { token: data.token } });

  socket.on("mensagem", (data) => {
    adicionarMensagem(data.nome, data.texto, data.nome === usuario.nome);
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

  socket.emit("entrarCanal", canal.id);
  carregarMensagens(canal.id);
}

async function carregarMensagens(canalId) {
  const res = await fetch(`/chat/mensagens/${canalId}`, { credentials: "include" });
  const mensagens = await res.json();
  mensagens.forEach((m) => adicionarMensagem(m.nome, m.texto, m.nome === usuario.nome));
}

function adicionarMensagem(nome, texto, propria = false) {
  const div = document.createElement("div");
  div.classList.add("mensagem");
  if (propria) div.classList.add("propria");

  div.innerHTML = `
    <span class="autor">${nome}</span>
    <div class="balao">${texto}</div>
  `;

  const container = document.getElementById("chat-mensagens");
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function enviar() {
  const input = document.getElementById("msg-input");
  const texto = input.value.trim();

  if (!texto) {
    return;
  }

  if (!canalAtual) {
    alert("Selecione um canal antes de enviar!");
    return;
  }

  socket.emit("mensagem", { texto, canalId: canalAtual });
  input.value = "";
}

async function logout() {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
  localStorage.removeItem("usuario");
  window.location.href = "/pages/login.html";
}

iniciar();
carregarCanais();