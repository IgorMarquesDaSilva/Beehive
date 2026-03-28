function trocarTela(tela) {
  document.getElementById("tela-login").style.display = tela === "login" ? "block" : "none";
  document.getElementById("tela-cadastro").style.display = tela === "cadastro" ? "block" : "none";
  document.getElementById("login-erro").innerText = "";
  document.getElementById("cadastro-erro").innerText = "";
}

async function login() {
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;

  if (!email || !senha) {
    document.getElementById("login-erro").innerText = "Preencha todos os campos";
    return;
  }

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, senha }),
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    window.location.href = "/pages/chat.html";
  } else {
    document.getElementById("login-erro").innerText = data.erro || "Erro no login";
  }
}

async function cadastrar() {
  const nome = document.getElementById("cadastro-nome").value;
  const email = document.getElementById("cadastro-email").value;
  const senha = document.getElementById("cadastro-senha").value;

  if (!nome || !email || !senha) {
    document.getElementById("cadastro-erro").innerText = "Preencha todos os campos";
    return;
  }

  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ nome, email, senha }),
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById("cadastro-erro").style.color = "#2ecc71";
    document.getElementById("cadastro-erro").innerText = "Conta criada! Faça o login.";
    setTimeout(() => trocarTela("login"), 1500);
  } else {
    document.getElementById("cadastro-erro").innerText = data.erro || "Erro ao cadastrar";
  }
}