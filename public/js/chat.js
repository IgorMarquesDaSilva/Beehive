const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
  window.location.href = "/pages/login.html";
}

let usuarioCargo = usuario.cargo || "usuario";

document.getElementById("nome-usuario").innerText = usuario.nome;

let canalAtual = null;
let socket = null;
let timeoutDigitando = null;
let usuarios = [];
let notificacoes = {};
let mencoes = {};
let arquivoSelecionado = null;
let canaisCache = [];
let mensagensCanalAtual = [];

function setTextoSeguro(elemento, texto) {
  if (elemento) elemento.innerText = texto;
}

function fecharCamadasFlutuantes() {
  fecharSugestoes();
}

function renderizarEstadoMensagens(tipo, texto) {
  const container = document.getElementById("chat-mensagens");
  if (!container) return;

  container.innerHTML = "";

  const estado = document.createElement("div");
  estado.classList.add("chat-empty-state");
  estado.dataset.tipo = tipo;

  const titulo = document.createElement("strong");
  titulo.innerText = texto;

  const detalhe = document.createElement("span");
  detalhe.innerText =
    tipo === "loading"
      ? "Buscando conversas recentes..."
      : "Use o campo abaixo para iniciar a conversa da equipe.";

  estado.appendChild(titulo);
  estado.appendChild(detalhe);
  container.appendChild(estado);
}

function atualizarResumoCanal() {
  const resumo = document.getElementById("resumo-canal");
  const atividade = document.getElementById("atividade-canal");

  if (!resumo || !atividade) return;

  resumo.innerHTML = "";
  atividade.innerHTML = "";

  if (!canalAtual) {
    const p = document.createElement("p");
    p.innerText =
      "Selecione um canal para visualizar insights, mensagens importantes e atividades recentes da equipe.";
    resumo.appendChild(p);
    renderizarAtividadePadrao();
    return;
  }

  const mensagensComTexto = mensagensCanalAtual.filter((m) => m.texto);
  const anexos = mensagensCanalAtual.filter((m) => m.arquivo_url).length;
  const autores = new Set(mensagensCanalAtual.map((m) => m.nome).filter(Boolean));
  const ultima = mensagensCanalAtual[mensagensCanalAtual.length - 1];

  const itens = [
    `${mensagensCanalAtual.length} mensagem(ns) carregada(s) neste canal.`,
    `${autores.size} participante(s) nas últimas mensagens.`,
    anexos ? `${anexos} anexo(s) recente(s).` : "Nenhum anexo recente.",
  ];

  itens.forEach((item) => {
    const p = document.createElement("p");
    p.innerText = item;
    resumo.appendChild(p);
  });

  if (mensagensComTexto.length > 0) {
    const destaque = document.createElement("p");
    destaque.classList.add("summary-highlight");
    destaque.innerText = `Último assunto: ${mensagensComTexto[mensagensComTexto.length - 1].texto.slice(0, 120)}`;
    resumo.appendChild(destaque);
  }

  const atividades = [
    {
      classe: "green",
      titulo: "Mensagens recentes",
      detalhe: ultima
        ? `${ultima.nome || "Alguém"} enviou a última mensagem`
        : "Sem mensagens neste canal",
    },
    {
      classe: "blue",
      titulo: "Participação",
      detalhe: `${autores.size} pessoa(s) apareceram no histórico carregado`,
    },
    {
      classe: "yellow",
      titulo: "Arquivos",
      detalhe: anexos ? `${anexos} arquivo(s) compartilhado(s)` : "Sem arquivos recentes",
    },
  ];

  atividades.forEach(adicionarAtividade);
}

function adicionarAtividade(item) {
  const atividade = document.getElementById("atividade-canal");
  if (!atividade) return;

  const div = document.createElement("div");
  div.classList.add("activity-item");

  const dot = document.createElement("span");
  dot.classList.add("activity-dot", item.classe);

  const texto = document.createElement("div");
  const strong = document.createElement("strong");
  strong.innerText = item.titulo;
  const small = document.createElement("small");
  small.innerText = item.detalhe;

  texto.appendChild(strong);
  texto.appendChild(small);
  div.appendChild(dot);
  div.appendChild(texto);
  atividade.appendChild(div);
}

function renderizarAtividadePadrao() {
  [
    ["green", "Chat em tempo real", "Funcionando no Render"],
    ["blue", "Voz por canal", "WebRTC conectado"],
    ["yellow", "Presença online", "Status em tempo real ativo"],
  ].forEach(([classe, titulo, detalhe]) =>
    adicionarAtividade({ classe, titulo, detalhe })
  );
}

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

    socket.on("erroCanal", (data) => {
      alert(data.mensagem || "Você não tem acesso a este canal.");
    });

    socket.on("mensagem", (data) => {
      const mensagemEhMinha =
        Number(data.usuarioId) === Number(usuario.id);
    
      if (
        Number(data.canalId) === Number(canalAtual)
      ) {
        adicionarMensagem(
          data.id,
          data.nome,
          data.texto,
          mensagemEhMinha,
          data.enviado_em,
          data.arquivo_url,
          data.arquivo_nome,
          data.arquivo_tipo
        );
      } else {
        const foiMencionado = verificarMencao(
          data.texto,
          usuario.nome
        );
    
        adicionarNotificacao(
          data.canalId,
          foiMencionado
        );
    
        if (!mensagemEhMinha) {
          tocarSomNotificacao();
    
          mostrarToast(
            data.nome,
            data.texto || "Enviou um arquivo"
          );
    
          atualizarTituloNotificacao();
        }
      }
    });
    socket.on("notificacaoMensagem", (data) => {
      const mensagemEhMinha =
        Number(data.usuarioId) === Number(usuario.id);
    
      if (mensagemEhMinha) return;
    
      if (
        Number(data.canalId) === Number(canalAtual)
      ) {
        return;
      }
    
      adicionarNotificacao(data.canalId);
    
      tocarSomNotificacao();
    
      mostrarToast(
        data.nome,
        data.texto || "Enviou um arquivo"
      );
    
      atualizarTituloNotificacao();
    });

    socket.on("mensagemApagada", (id) => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
    });

    socket.on("digitando", (data) => {
      document.getElementById("digitando-texto").innerText =
        `${data.nome} está digitando...`;
    });

    socket.on("parouDigitar", () => {
      document.getElementById("digitando-texto").innerText = "";
    });

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
      document.getElementById("chamada-nome").innerText =
        `${nome} está te chamando...`;
      document.getElementById("modal-chamada").style.display = "block";
      document.getElementById("modal-chamada-overlay").style.display = "block";
    });

    socket.on("chamadaAceita", async ({ de }) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
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
  const lista = document.getElementById("lista-canais");

  if (lista) {
    lista.innerHTML = '<div class="sidebar-loading">Carregando canais...</div>';
  }

  try {
    const res = await fetch("/chat/canais", { credentials: "include" });

    if (!res.ok) {
      throw new Error("Erro ao carregar canais");
    }

    const canais = await res.json();
    canaisCache = canais;

    if (!lista) return;

    lista.innerHTML = "";

    if (canais.length === 0) {
      lista.innerHTML = '<div class="sidebar-loading">Nenhum canal disponível.</div>';
      return;
    }

    const podeExcluir =
      usuarioCargo === "admin" || usuarioCargo === "moderador";

    canais.forEach((canal) => {
      const div = document.createElement("div");
      div.classList.add("canal-item");
      div.setAttribute("data-canal-id", canal.id);

      const esquerda = document.createElement("div");
      esquerda.classList.add("canal-esquerda");

      const nome = document.createElement("span");
      nome.classList.add("canal-nome");
      nome.innerText = canal.privado ? `🔒 ${canal.nome}` : canal.nome;

      const badge = document.createElement("span");
      badge.classList.add("badge");
      badge.id = `badge-${canal.id}`;
      badge.style.display = "none";
      badge.innerText = "●";

      nome.appendChild(badge);
      esquerda.appendChild(nome);

      esquerda.onclick = () => entrarCanalTexto(canal.id, canal.nome, div);

      const direita = document.createElement("div");
      direita.classList.add("canal-direita");

      const btnVoz = document.createElement("button");
      btnVoz.classList.add("btn-entrar-voz");
      btnVoz.setAttribute("data-canal-id", canal.id);
      btnVoz.innerText = "🎙️";

      btnVoz.onclick = (e) => {
        e.stopPropagation();
        entrarVoz(canal.id, canal.nome);
      };

      direita.appendChild(btnVoz);

      if (podeExcluir && canal.nome !== "geral") {
        const btnExcluir = document.createElement("button");
        btnExcluir.classList.add("btn-excluir-canal");
        btnExcluir.innerText = "🗑️";
        btnExcluir.title = "Excluir canal";

        btnExcluir.onclick = async (e) => {
          e.stopPropagation();

          if (!confirm(`Apagar canal "${canal.nome}"?`)) return;

          const res = await fetch(`/chat/canais/${canal.id}`, {
            method: "DELETE",
            credentials: "include",
          });

          const data = await res.json();

          if (!res.ok) {
            alert(data.erro || "Erro ao apagar canal");
            return;
          }

          if (Number(canalAtual) === Number(canal.id)) {
            canalAtual = null;
            mensagensCanalAtual = [];
            renderizarEstadoMensagens("empty", "Selecione um canal");
            document.getElementById("canal-ativo").innerText =
              "Selecione um canal";
            atualizarResumoCanal();
          }

          carregarCanais();
        };

        direita.appendChild(btnExcluir);
      }

      div.appendChild(esquerda);
      div.appendChild(direita);
      lista.appendChild(div);
    });
  } catch (err) {
    console.error(err);

    if (lista) {
      lista.innerHTML = '<div class="sidebar-loading erro-lista">Erro ao carregar canais.</div>';
    }
  }
}

function renderizarUsuariosOnline(lista) {
  const container = document.getElementById("lista-online");

  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(lista)) return;

  const usuariosFiltrados = lista.filter(
    (u) => Number(u.id) !== Number(usuario.id)
  );

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

    if (u.status === "ausente") {
      status.innerText = "Ausente";
    } else if (u.status === "ocupado") {
      status.innerText = "Ocupado";
    } else if (u.status === "offline") {
      status.innerText = "Invisível";
    } else {
      status.innerText = u.emVoz
        ? "Em chamada"
        : "Online";
    }

    const bolinha = document.createElement("span");
    bolinha.classList.add("online-dot");

    if (u.status === "online") {
      bolinha.classList.add("status-online");
    }

    if (u.status === "ausente") {
      bolinha.classList.add("status-ausente");
    }

    if (u.status === "ocupado") {
      bolinha.classList.add("status-ocupado");
    }

    if (u.status === "offline") {
      bolinha.classList.add("status-offline");
    }

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

  return `${partes[0].charAt(0)}${partes[
    partes.length - 1
  ].charAt(0)}`.toUpperCase();
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
  atualizarTituloNotificacao();
}

function entrarCanalTexto(canalId, nomeCanal, el) {
  canalAtual = canalId;
  mensagensCanalAtual = [];
  fecharCamadasFlutuantes();

  document.querySelectorAll(".canal-item").forEach((item) => {
    item.classList.remove("ativo");
  });

  el.closest(".canal-item").classList.add("ativo");

  document.getElementById("canal-ativo").innerText = `# ${nomeCanal}`;
  renderizarEstadoMensagens("loading", `Carregando #${nomeCanal}`);
  document.getElementById("digitando-texto").innerText = "";

  const busca = document.getElementById("busca-canal");
  const resultados = document.getElementById("resultados-busca");

  if (busca) busca.value = "";
  if (resultados) resultados.innerHTML = "";

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
      const data = await res.json();
      throw new Error(data.erro || "Erro ao carregar mensagens");
    }

    const mensagens = await res.json();
    mensagensCanalAtual = mensagens;

    const container = document.getElementById("chat-mensagens");
    if (container) container.innerHTML = "";

    if (mensagens.length === 0) {
      renderizarEstadoMensagens("empty", "Nenhuma mensagem ainda");
      atualizarResumoCanal();
      return;
    }

    mensagens.forEach((m) => {
      adicionarMensagem(
        m.id,
        m.nome,
        m.texto,
        Number(m.usuario_id) === Number(usuario.id),
        m.enviado_em,
        m.arquivo_url,
        m.arquivo_nome,
        m.arquivo_tipo
      );
    });

    atualizarResumoCanal();
  } catch (err) {
    console.error(err);
    renderizarEstadoMensagens("empty", err.message || "Erro ao carregar mensagens.");
    atualizarResumoCanal();
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

function adicionarMensagem(
  id,
  nome,
  texto,
  propria = false,
  enviado_em = null,
  arquivo_url = null,
  arquivo_nome = null,
  arquivo_tipo = null
) {
  if (canalAtual) {
    const jaExiste = mensagensCanalAtual.some((m) => Number(m.id) === Number(id));

    if (!jaExiste) {
      mensagensCanalAtual.push({
        id,
        nome,
        texto,
        enviado_em,
        arquivo_url,
        arquivo_nome,
        arquivo_tipo,
      });
    }
  }

  const div = document.createElement("div");
  div.classList.add("mensagem");
  div.setAttribute("data-id", id);

  if (propria) {
    div.classList.add("propria");
  }

  const avatar = document.createElement("div");
  avatar.classList.add("msg-avatar");
  avatar.innerText = gerarIniciais(nome);
  avatar.style.background = gerarCorUsuario(nome);

  const conteudo = document.createElement("div");
  conteudo.classList.add("msg-conteudo");

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

  if (texto && texto.trim() !== "") {
    balao.appendChild(criarTextoComMencoes(texto));
  }

  if (arquivo_url) {
    balao.appendChild(
      criarAnexoMensagem(arquivo_url, arquivo_nome, arquivo_tipo)
    );
  }

  balaoWrapper.appendChild(balao);

  if (propria) {
    const btnApagar = document.createElement("button");
    btnApagar.classList.add("btn-apagar");
    btnApagar.innerText = "✕";
    btnApagar.onclick = () => apagarMensagem(id);

    balaoWrapper.appendChild(btnApagar);
  }

  conteudo.appendChild(autor);
  conteudo.appendChild(balaoWrapper);

  div.appendChild(avatar);
  div.appendChild(conteudo);

  const container = document.getElementById("chat-mensagens");
  const empty = container.querySelector(".chat-empty-state");

  if (empty) empty.remove();

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  atualizarResumoCanal();
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

  const temTexto = texto.length > 0;
  const temArquivo = !!arquivoSelecionado;

  if (!temTexto && !temArquivo) return;

  if (!canalAtual) {
    alert("Selecione um canal antes de enviar!");
    return;
  }

  if (!socket || !socket.connected) {
    alert("Você está desconectado.");
    return;
  }

  socket.emit("mensagem", {
    texto,
    canalId: canalAtual,
    arquivo_url: arquivoSelecionado?.url || null,
    arquivo_nome: arquivoSelecionado?.nomeOriginal || null,
    arquivo_tipo: arquivoSelecionado?.tipo || null,
  });

  socket.emit("parouDigitar", canalAtual);

  input.value = "";
  arquivoSelecionado = null;

  removerPreviewArquivo();
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

function toggleCanalPrivado() {
  const checkbox = document.getElementById("canal-privado");
  const membros = document.getElementById("selecionar-membros");

  if (!checkbox || !membros) return;

  membros.style.display = checkbox.checked ? "block" : "none";
}

function renderizarUsuariosCanalPrivado() {
  const container = document.getElementById("lista-membros-canal");

  if (!container) return;

  container.innerHTML = "";

  usuarios.forEach((u) => {
    if (Number(u.id) === Number(usuario.id)) return;

    const item = document.createElement("div");
    item.classList.add("membro-canal-item");

    const label = document.createElement("label");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.classList.add("check-membro-canal");
    check.value = u.id;

    const span = document.createElement("span");
    span.innerText = `${u.nome} (${u.cargo || "usuario"})`;

    label.appendChild(check);
    label.appendChild(span);
    item.appendChild(label);

    container.appendChild(item);
  });
}

function abrirModalCanal() {
  fecharCamadasFlutuantes();

  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("modal-canal").style.display = "block";
  document.getElementById("canal-nome").focus();
  document.getElementById("canal-erro").innerText = "";
  document.getElementById("canal-nome").value = "";
  document.getElementById("canal-descricao").value = "";

  const privado = document.getElementById("canal-privado");

  if (privado) {
    privado.checked = false;
  }

  toggleCanalPrivado();
  renderizarUsuariosCanalPrivado();
}

function fecharModalCanal() {
  fecharCamadasFlutuantes();

  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("modal-canal").style.display = "none";
}

async function criarCanal() {
  const nome = document.getElementById("canal-nome").value.trim();

  const descricao = document
    .getElementById("canal-descricao")
    .value.trim();

  const privado =
    document.getElementById("canal-privado")?.checked || false;

  const membrosSelecionados = Array.from(
    document.querySelectorAll(".check-membro-canal:checked")
  ).map((el) => Number(el.value));

  if (!nome) {
    document.getElementById("canal-erro").innerText =
      "Nome do canal é obrigatório";
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
        privado,
        membros: membrosSelecionados,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      fecharModalCanal();
      await carregarCanais();
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

function gerarCorUsuario(nome) {
  const cores = [
    "#4f6df5",
    "#10b981",
    "#f97316",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
  ];

  let hash = 0;

  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }

  return cores[Math.abs(hash) % cores.length];
}

function abrirSeletorArquivo() {
  const input = document.getElementById("input-arquivo");

  if (input) {
    input.click();
  }
}

async function uploadArquivo(event) {
  const arquivo = event.target.files[0];

  if (!arquivo) return;

  const formData = new FormData();
  formData.append("arquivo", arquivo);

  try {
    const res = await fetch("/chat/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao enviar arquivo");
      return;
    }

    arquivoSelecionado = data;
    mostrarPreviewArquivo(data);
  } catch (err) {
    console.error(err);
    alert("Erro ao enviar arquivo.");
  }
}

function mostrarPreviewArquivo(arquivo) {
  removerPreviewArquivo();

  const area = document.querySelector(".chat-input-area");

  if (!area) return;

  const preview = document.createElement("div");
  preview.classList.add("preview-arquivo");
  preview.id = "preview-arquivo";

  const nome = document.createElement("span");
  nome.innerText = `📎 ${arquivo.nomeOriginal}`;

  const remover = document.createElement("button");
  remover.innerText = "✕";

  remover.onclick = () => {
    arquivoSelecionado = null;
    removerPreviewArquivo();
  };

  preview.appendChild(nome);
  preview.appendChild(remover);

  area.prepend(preview);
}

function removerPreviewArquivo() {
  const preview = document.getElementById("preview-arquivo");

  if (preview) {
    preview.remove();
  }
}

function criarAnexoMensagem(url, nome, tipo) {
  const urlCompleta = url.startsWith("http")
    ? url
    : `${window.location.origin}${url}`;

  const container = document.createElement("div");
  container.classList.add("anexo-mensagem");

  const ehImagem = tipo && tipo.startsWith("image/");

  if (ehImagem) {
    const img = document.createElement("img");
    img.src = urlCompleta;
    img.alt = nome || "Imagem enviada";
    img.classList.add("anexo-imagem");

    const link = document.createElement("a");
    link.href = urlCompleta;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.appendChild(img);

    container.appendChild(link);
  } else {
    const card = document.createElement("a");
    card.href = urlCompleta;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.classList.add("anexo-arquivo");

    const icone = document.createElement("span");
    icone.classList.add("anexo-icone");
    icone.innerText = escolherIconeArquivo(tipo);

    const info = document.createElement("div");

    const titulo = document.createElement("strong");
    titulo.innerText = nome || "Arquivo enviado";

    const subtitulo = document.createElement("small");
    subtitulo.innerText = "Clique para abrir ou baixar";

    info.appendChild(titulo);
    info.appendChild(subtitulo);

    card.appendChild(icone);
    card.appendChild(info);

    container.appendChild(card);
  }

  return container;
}

function escolherIconeArquivo(tipo) {
  if (!tipo) return "📎";
  if (tipo.includes("pdf")) return "📄";
  if (tipo.includes("word")) return "📝";
  if (tipo.includes("excel") || tipo.includes("spreadsheet")) return "📊";
  if (tipo.includes("text")) return "📃";
  return "📎";
}

async function inicializarChat() {
  await carregarUsuarios();

  const usuarioAtual = usuarios.find(
    (u) => Number(u.id) === Number(usuario.id)
  );

  usuarioCargo = usuarioAtual?.cargo || usuario.cargo || "usuario";

  await iniciar();
  await carregarCanais();
}
function alterarStatus() {
  const select = document.getElementById("status-select");

  if (!select || !socket) return;

  const status = select.value;

  socket.emit("alterarStatus", status);

  atualizarCorStatus(status);
}

function atualizarCorStatus(status) {
  const dot = document.getElementById("meu-status-dot");

  if (!dot) return;

  dot.className = "online-dot";

  if (status === "online") {
    dot.classList.add("status-online");
  }

  if (status === "ausente") {
    dot.classList.add("status-ausente");
  }

  if (status === "ocupado") {
    dot.classList.add("status-ocupado");
  }

  if (status === "offline") {
    dot.classList.add("status-offline");
  }
}
function tocarSomNotificacao() {
  const audio = document.getElementById(
    "notification-sound"
  );

  if (!audio) return;

  audio.currentTime = 0;

  audio.play().catch(() => {});
}

function mostrarToast(usuarioNome, mensagem) {
  const container =
    document.getElementById("toast-container");

  if (!container) return;

  const toast = document.createElement("div");
  toast.classList.add("toast");

  const autor = document.createElement("strong");
  autor.innerText = usuarioNome;

  const texto = document.createElement("small");
  texto.innerText = mensagem;

  toast.appendChild(autor);
  toast.appendChild(texto);

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function atualizarTituloNotificacao() {
  const total = Object.values(notificacoes)
    .reduce((acc, val) => acc + val, 0);

  if (total <= 0) {
    document.title = "Beehive - Chat";
    return;
  }

  document.title = `(${total}) Beehive - Chat`;
}

async function buscarNoCanal(termo) {
  const resultados = document.getElementById("resultados-busca");

  if (!resultados) return;

  resultados.innerHTML = "";

  if (!canalAtual) {
    resultados.innerHTML = '<p class="search-empty">Selecione um canal.</p>';
    return;
  }

  const termoLimpo = termo.trim();

  if (termoLimpo.length < 2) {
    resultados.innerHTML = "";
    return;
  }

  resultados.innerHTML = '<p class="search-empty">Buscando...</p>';

  try {
    const res = await fetch(
      `/chat/mensagens/${canalAtual}/buscar?q=${encodeURIComponent(termoLimpo)}`,
      { credentials: "include" }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.erro || "Erro ao buscar mensagens");
    }

    resultados.innerHTML = "";

    if (data.length === 0) {
      resultados.innerHTML = '<p class="search-empty">Nenhuma mensagem encontrada.</p>';
      return;
    }

    data.forEach((m) => {
      const item = document.createElement("button");
      item.type = "button";
      item.classList.add("search-result-item");

      const autor = document.createElement("strong");
      autor.innerText = m.nome;

      const texto = document.createElement("span");
      texto.innerText = m.texto || m.arquivo_nome || "Arquivo enviado";

      const dataMsg = document.createElement("small");
      dataMsg.innerText = new Date(m.enviado_em).toLocaleString("pt-BR");

      item.appendChild(autor);
      item.appendChild(texto);
      item.appendChild(dataMsg);
      resultados.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    resultados.innerHTML = '<p class="search-empty">Erro ao buscar mensagens.</p>';
  }
}

function configurarBuscaCanal() {
  const input = document.getElementById("busca-canal");
  if (!input) return;

  let timeoutBusca = null;

  input.addEventListener("input", () => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => buscarNoCanal(input.value), 300);
  });
}

document.addEventListener("DOMContentLoaded", configurarBuscaCanal);
inicializarChat();
