const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

let canais = [];
let usuarios = [];
let canalSelecionado = null;
let canalEditando = null;

document.addEventListener("DOMContentLoaded", async () => {
  await carregarUsuarios();
  await carregarCanaisConfig();
});

function trocarAba(aba) {
  document.querySelectorAll(".config-menu button").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".config-section").forEach((section) => {
    section.classList.remove("active");
  });

  const section = document.getElementById(`aba-${aba}`);
  if (section) section.classList.add("active");

  const botao = Array.from(document.querySelectorAll(".config-menu button")).find(
    (btn) => btn.getAttribute("onclick")?.includes(`'${aba}'`)
  );

  if (botao) botao.classList.add("active");

  const titulos = {
    canais: "Canais",
    usuarios: "Usuários",
    permissoes: "Permissões",
    voz: "Voz",
    integracoes: "Integrações",
    aparencia: "Aparência",
  };

  document.getElementById("titulo-aba").innerText =
    titulos[aba] || "Configurações";
}

async function carregarCanaisConfig() {
  try {
    const res = await fetch("/chat/canais", {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Erro ao carregar canais");

    canais = await res.json();
    renderizarCanaisConfig();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar canais.");
  }
}

async function carregarUsuarios() {
  try {
    const res = await fetch("/chat/usuarios", {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Erro ao carregar usuários");

    usuarios = await res.json();
  } catch (err) {
    console.error(err);
    usuarios = [];
  }
}

function renderizarCanaisConfig() {
  const lista = document.getElementById("lista-canais-config");
  if (!lista) return;

  lista.innerHTML = "";

  if (canais.length === 0) {
    lista.innerHTML = "<p>Nenhum canal encontrado.</p>";
    return;
  }

  canais.forEach((canal) => {
    const card = document.createElement("div");
    card.classList.add("admin-card");

    const info = document.createElement("div");
    info.classList.add("admin-card-info");

    const titulo = document.createElement("h4");
    titulo.innerText = `${canal.privado ? "🔒" : "#"} ${canal.nome}`;

    const descricao = document.createElement("p");
    descricao.innerText = canal.descricao || "Sem descrição";

    const badges = document.createElement("div");
    badges.classList.add("admin-badges");

    const badgeTipo = document.createElement("span");
    badgeTipo.classList.add("badge", canal.privado ? "private" : "public");
    badgeTipo.innerText = canal.privado ? "Privado" : "Público";

    badges.appendChild(badgeTipo);

    info.appendChild(titulo);
    info.appendChild(descricao);
    info.appendChild(badges);

    const actions = document.createElement("div");
    actions.classList.add("admin-actions");

    if (canal.nome !== "geral") {
      const btnEditar = document.createElement("button");
      btnEditar.classList.add("btn-manage");
      btnEditar.innerText = "Editar";
      btnEditar.onclick = () => abrirModalEditarCanal(canal);

      actions.appendChild(btnEditar);
    }

    if (canal.privado) {
      const btnManage = document.createElement("button");
      btnManage.classList.add("btn-manage");
      btnManage.innerText = "Gerenciar membros";
      btnManage.onclick = () => abrirModalMembros(canal);

      actions.appendChild(btnManage);
    }

    if (canal.nome !== "geral") {
      const btnDelete = document.createElement("button");
      btnDelete.classList.add("btn-delete");
      btnDelete.innerText = "Excluir";
      btnDelete.onclick = () => excluirCanal(canal);

      actions.appendChild(btnDelete);
    }

    card.appendChild(info);
    card.appendChild(actions);
    lista.appendChild(card);
  });
}

async function excluirCanal(canal) {
  const confirmar = confirm(`Deseja realmente excluir o canal "${canal.nome}"?`);
  if (!confirmar) return;

  try {
    const res = await fetch(`/chat/canais/${canal.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao excluir canal");
      return;
    }

    await carregarCanaisConfig();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir canal.");
  }
}

function abrirModalEditarCanal(canal) {
  canalEditando = canal;

  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("modal-editar-canal").style.display = "block";

  document.getElementById("editar-canal-nome").value = canal.nome || "";
  document.getElementById("editar-canal-descricao").value =
    canal.descricao || "";
  document.getElementById("editar-canal-privado").checked =
    Number(canal.privado) === 1;
}

function fecharModalEditarCanal() {
  canalEditando = null;

  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("modal-editar-canal").style.display = "none";
}

async function salvarEdicaoCanal() {
  if (!canalEditando) return;

  const nome = document.getElementById("editar-canal-nome").value.trim();
  const descricao = document
    .getElementById("editar-canal-descricao")
    .value.trim();

  const privado = document.getElementById("editar-canal-privado").checked;

  if (!nome) {
    alert("Nome do canal é obrigatório.");
    return;
  }

  try {
    const res = await fetch(`/chat/canais/${canalEditando.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        nome,
        descricao,
        privado,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao editar canal");
      return;
    }

    fecharModalEditarCanal();
    await carregarCanaisConfig();
  } catch (err) {
    console.error(err);
    alert("Erro ao editar canal.");
  }
}

async function abrirModalMembros(canal) {
  canalSelecionado = canal;

  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("modal-membros").style.display = "block";
  document.getElementById("modal-canal-nome").innerText = `Canal: ${canal.nome}`;

  await carregarMembrosCanal();
  montarSelectUsuarios();
}

function fecharModalMembros() {
  canalSelecionado = null;

  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("modal-membros").style.display = "none";
}

async function carregarMembrosCanal() {
  if (!canalSelecionado) return;

  try {
    const res = await fetch(`/chat/canais/${canalSelecionado.id}/membros`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Erro ao carregar membros");

    const membros = await res.json();
    renderizarMembrosCanal(membros);
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar membros do canal.");
  }
}

function renderizarMembrosCanal(membros) {
  const lista = document.getElementById("lista-membros-canal");
  if (!lista) return;

  lista.innerHTML = "";

  if (!membros || membros.length === 0) {
    lista.innerHTML = "<p>Nenhum membro adicionado ainda.</p>";
    return;
  }

  membros.forEach((membro) => {
    const item = document.createElement("div");
    item.classList.add("member-item");

    const info = document.createElement("div");
    info.classList.add("member-info");

    const nome = document.createElement("strong");
    nome.innerText = membro.nome;

    const email = document.createElement("small");
    email.innerText = `${membro.email || "sem email"} • ${
      membro.cargo || "usuario"
    }`;

    info.appendChild(nome);
    info.appendChild(email);

    const btnRemover = document.createElement("button");
    btnRemover.classList.add("btn-remove");
    btnRemover.innerText = "Remover";
    btnRemover.onclick = () => removerMembroCanal(membro.id);

    item.appendChild(info);
    item.appendChild(btnRemover);

    lista.appendChild(item);
  });
}

async function montarSelectUsuarios() {
  const select = document.getElementById("select-usuario-canal");
  if (!select) return;

  select.innerHTML = `<option value="">Selecionar usuário</option>`;

  usuarios.forEach((u) => {
    if (Number(u.id) === Number(usuario.id)) return;

    const option = document.createElement("option");
    option.value = u.id;
    option.innerText = `${u.nome} (${u.cargo || "usuario"})`;

    select.appendChild(option);
  });
}

async function adicionarMembroCanal() {
  if (!canalSelecionado) return;

  const select = document.getElementById("select-usuario-canal");
  const usuarioId = Number(select.value);

  if (!usuarioId) {
    alert("Selecione um usuário.");
    return;
  }

  try {
    const res = await fetch(`/chat/canais/${canalSelecionado.id}/membros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        usuarioId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao adicionar membro");
      return;
    }

    select.value = "";

    await carregarMembrosCanal();
  } catch (err) {
    console.error(err);
    alert("Erro ao adicionar membro.");
  }
}

async function removerMembroCanal(usuarioId) {
  if (!canalSelecionado) return;

  const confirmar = confirm("Remover este usuário do canal?");
  if (!confirmar) return;

  try {
    const res = await fetch(
      `/chat/canais/${canalSelecionado.id}/membros/${usuarioId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao remover membro");
      return;
    }

    await carregarMembrosCanal();
  } catch (err) {
    console.error(err);
    alert("Erro ao remover membro.");
  }
}