const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

async function carregarPerfil() {
  const res = await fetch("/auth/perfil", { credentials: "include" });
  const data = await res.json();

  if (!res.ok) {
    window.location.href = "/pages/login.html";
    return;
  }

  document.getElementById("perfil-nome").value = data.nome;
  document.getElementById("perfil-email").value = data.email;
  document.getElementById("perfil-bio").value = data.bio || "";
  document.getElementById("perfil-criado").value = new Date(data.criado_em).toLocaleDateString("pt-BR");

  // iniciais no avatar
  const iniciais = data.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  document.getElementById("avatar-iniciais").innerText = iniciais;
}

async function salvarPerfil() {
  const nome = document.getElementById("perfil-nome").value.trim();
  const bio = document.getElementById("perfil-bio").value.trim();
  const senhaAtual = document.getElementById("senha-atual").value;
  const novaSenha = document.getElementById("senha-nova").value;

  document.getElementById("perfil-sucesso").innerText = "";
  document.getElementById("perfil-erro").innerText = "";

  if (!nome) {
    document.getElementById("perfil-erro").innerText = "Nome não pode ser vazio";
    return;
  }

  const body = { nome, bio };

  if (senhaAtual || novaSenha) {
    if (!senhaAtual || !novaSenha) {
      document.getElementById("perfil-erro").innerText = "Preencha a senha atual e a nova senha";
      return;
    }
    body.senhaAtual = senhaAtual;
    body.novaSenha = novaSenha;
  }

  const res = await fetch("/auth/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById("perfil-sucesso").innerText = "Perfil atualizado com sucesso!";
    document.getElementById("senha-atual").value = "";
    document.getElementById("senha-nova").value = "";

    // atualiza o nome no localStorage
    const usuarioAtualizado = { ...usuario, nome };
    localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
  } else {
    document.getElementById("perfil-erro").innerText = data.erro || "Erro ao atualizar perfil";
  }
}

carregarPerfil();