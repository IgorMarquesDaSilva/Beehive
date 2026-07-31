let reunioesDisponiveis = [];
let reuniaoAtual = null;
let conviteAtual = null;
let socketReunioes = null;
let streamLocalReuniao = null;
let peersReuniao = {};
let microfoneMutado = false;
let cronometroReuniao = null;
let inicioCronometro = null;
let configuracaoIceCarregada = false;
let configuracaoIceReuniao = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

async function requisicaoReuniao(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || "Não foi possível concluir a operação");
  }

  return data;
}

async function carregarConfiguracaoIce() {
  if (configuracaoIceCarregada) return;

  try {
    const data = await requisicaoReuniao("/meetings/ice-servers");

    if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      configuracaoIceReuniao = {
        iceServers: data.iceServers,
      };
    }
  } catch (err) {
    console.warn("Usando apenas o servidor STUN padrão:", err);
  } finally {
    configuracaoIceCarregada = true;
  }
}

async function carregarReunioes() {
  const lista = document.getElementById("lista-reunioes");
  if (!lista) return;

  lista.innerHTML = '<p class="meeting-list-state">Carregando reuniões...</p>';

  try {
    reunioesDisponiveis = await requisicaoReuniao("/meetings");
    renderizarListaReunioes();
  } catch (err) {
    console.error(err);
    lista.innerHTML =
      '<p class="meeting-list-state">Não foi possível carregar as reuniões.</p>';
  }
}

function renderizarListaReunioes() {
  const lista = document.getElementById("lista-reunioes");
  if (!lista) return;

  lista.innerHTML = "";

  if (reunioesDisponiveis.length === 0) {
    lista.innerHTML =
      '<p class="meeting-list-state">Nenhuma reunião disponível.</p>';
    return;
  }

  reunioesDisponiveis.forEach((reuniao) => {
    const item = document.createElement("button");
    item.type = "button";
    item.classList.add("meeting-list-item");

    if (reuniao.minha_situacao === "pendente") {
      item.classList.add("has-invitation");
    }

    const texto = document.createElement("span");
    texto.classList.add("meeting-list-copy");

    const titulo = document.createElement("strong");
    titulo.innerText = reuniao.titulo;

    const detalhe = document.createElement("small");
    detalhe.innerText =
      reuniao.minha_situacao === "pendente"
        ? `Convite de ${reuniao.criador_nome}`
        : `${reuniao.participantes_ativos || 0} participante(s)`;

    const status = document.createElement("span");
    status.classList.add("meeting-list-badge");
    status.innerText =
      reuniao.minha_situacao === "pendente" ? "Convite" : "Entrar";

    texto.appendChild(titulo);
    texto.appendChild(detalhe);
    item.appendChild(texto);
    item.appendChild(status);
    item.addEventListener("click", () => selecionarReuniao(reuniao));
    lista.appendChild(item);
  });
}

async function selecionarReuniao(reuniao) {
  if (reuniao.minha_situacao === "pendente") {
    await abrirConviteReuniao(reuniao.id);
    return;
  }

  await entrarNaReuniao(reuniao.id);
}

async function abrirModalCriarReuniao() {
  const modal = document.getElementById("modal-criar-reuniao");
  const overlay = document.getElementById("modal-reuniao-overlay");
  const lista = document.getElementById("lista-convidados-reuniao");
  const erro = document.getElementById("reuniao-erro");

  if (!modal || !overlay || !lista) return;

  modal.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("modal-open");
  document.getElementById("reuniao-titulo").value = "";
  if (erro) erro.innerText = "";
  lista.innerHTML = '<p class="meeting-list-state">Carregando membros...</p>';

  try {
    const membros = await requisicaoReuniao("/chat/usuarios");
    renderizarConvidadosReuniao(membros);
  } catch (err) {
    console.error(err);
    lista.innerHTML =
      '<p class="meeting-list-state">Não foi possível carregar os membros.</p>';
  }
}

function renderizarConvidadosReuniao(membros) {
  const lista = document.getElementById("lista-convidados-reuniao");
  if (!lista) return;

  lista.innerHTML = "";

  membros
    .filter((membro) => Number(membro.id) !== Number(usuario.id))
    .forEach((membro) => {
      const label = document.createElement("label");
      label.classList.add("meeting-member-option");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("check-convidado-reuniao");
      checkbox.value = membro.id;
      checkbox.addEventListener("change", () => {
        const selecionados = document.querySelectorAll(
          ".check-convidado-reuniao:checked"
        );

        if (selecionados.length > 8) {
          checkbox.checked = false;
          alert("Selecione no máximo 8 convidados.");
        }
      });

      const avatar = document.createElement("span");
      avatar.classList.add("meeting-member-avatar");
      avatar.innerText = gerarIniciais(membro.nome);

      const copy = document.createElement("span");
      const nome = document.createElement("strong");
      nome.innerText = membro.nome;
      const cargo = document.createElement("small");
      cargo.innerText = membro.cargo || "usuario";

      copy.appendChild(nome);
      copy.appendChild(cargo);
      label.appendChild(checkbox);
      label.appendChild(avatar);
      label.appendChild(copy);
      lista.appendChild(label);
    });
}

function fecharModalCriarReuniao() {
  const modal = document.getElementById("modal-criar-reuniao");
  const overlay = document.getElementById("modal-reuniao-overlay");

  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
  document.body.classList.remove("modal-open");
}

async function criarReuniao() {
  const titulo = document.getElementById("reuniao-titulo")?.value.trim();
  const erro = document.getElementById("reuniao-erro");
  const botao = document.getElementById("btn-criar-reuniao");
  const convidados = Array.from(
    document.querySelectorAll(".check-convidado-reuniao:checked")
  ).map((item) => Number(item.value));

  if (erro) erro.innerText = "";

  if (!titulo || titulo.length < 3) {
    if (erro) erro.innerText = "Informe um título com pelo menos 3 caracteres.";
    return;
  }

  if (botao) {
    botao.disabled = true;
    botao.innerText = "Criando...";
  }

  try {
    const reuniao = await requisicaoReuniao("/meetings", {
      method: "POST",
      body: JSON.stringify({ titulo, convidados }),
    });

    fecharModalCriarReuniao();
    await carregarReunioes();
    await entrarNaReuniao(reuniao.id);
  } catch (err) {
    if (erro) erro.innerText = err.message;
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.innerText = "Criar e entrar";
    }
  }
}

async function abrirConviteReuniao(reuniaoId) {
  try {
    const detalhes = await requisicaoReuniao(`/meetings/${reuniaoId}`);
    conviteAtual = detalhes;

    document.getElementById("convite-reuniao-titulo").innerText =
      detalhes.titulo;
    document.getElementById("convite-reuniao-texto").innerText =
      "Você foi convidado para participar desta reunião de voz.";

    const modal = document.getElementById("modal-convite-reuniao");
    const overlay = document.getElementById("modal-convite-overlay");
    if (modal) modal.style.display = "block";
    if (overlay) overlay.style.display = "block";
    document.body.classList.add("modal-open");
  } catch (err) {
    alert(err.message);
  }
}

function fecharConviteReuniao() {
  const modal = document.getElementById("modal-convite-reuniao");
  const overlay = document.getElementById("modal-convite-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
  document.body.classList.remove("modal-open");
}

async function responderConviteReuniao(resposta) {
  if (!conviteAtual) return;

  try {
    const reuniaoId = conviteAtual.id;
    await requisicaoReuniao(`/meetings/${reuniaoId}/resposta`, {
      method: "POST",
      body: JSON.stringify({ resposta }),
    });

    fecharConviteReuniao();
    await carregarReunioes();

    if (resposta === "aceito") {
      await entrarNaReuniao(reuniaoId);
    }
  } catch (err) {
    alert(err.message);
  }
}

function configurarSocketReunioes(socketAtual) {
  if (!socketAtual || socketReunioes === socketAtual) return;
  socketReunioes = socketAtual;

  socketReunioes.on("reunioesAtualizadas", () => {
    carregarReunioes();

    if (reuniaoAtual) {
      atualizarDetalhesReuniaoAtual();
    }
  });

  socketReunioes.on("conviteReuniao", ({ reuniaoId }) => {
    carregarReunioes();
    abrirConviteReuniao(reuniaoId);
  });

  socketReunioes.on(
    "entradaReuniaoConfirmada",
    async ({ reuniao, membros }) => {
      if (!reuniaoAtual) return;

      reuniaoAtual = {
        ...reuniaoAtual,
        ...reuniao,
      };

      adicionarParticipanteSala({
        socketId: socketReunioes.id,
        usuarioId: usuario.id,
        nome: usuario.nome,
        mutado: microfoneMutado,
        souEu: true,
      });

      for (const membro of membros || []) {
        adicionarParticipanteSala(membro);
        await criarPeerReuniao(membro.socketId, true);
      }

      atualizarContadorParticipantes();
      atualizarDetalhesReuniaoAtual();
    }
  );

  socketReunioes.on(
    "participanteEntrouReuniao",
    async (participante) => {
      if (
        !reuniaoAtual ||
        Number(participante.reuniaoId) !== Number(reuniaoAtual.id)
      ) {
        return;
      }

      adicionarParticipanteSala(participante);
      await criarPeerReuniao(participante.socketId, false);
      atualizarContadorParticipantes();
      atualizarDetalhesReuniaoAtual();
    }
  );

  socketReunioes.on("participanteSaiuReuniao", ({ socketId }) => {
    removerParticipanteSala(socketId);
    removerAudioReuniao(socketId);
    atualizarContadorParticipantes();
    atualizarDetalhesReuniaoAtual();
  });

  socketReunioes.on(
    "participanteMudoAlterado",
    ({ socketId, mutado }) => {
      atualizarEstadoMicrofoneParticipante(socketId, mutado);
    }
  );

  socketReunioes.on("offerReuniao", async ({ offer, de }) => {
    if (!streamLocalReuniao) return;

    const peer = await criarPeerReuniao(de, false);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketReunioes.emit("answerReuniao", { answer, para: de });
  });

  socketReunioes.on("answerReuniao", async ({ answer, de }) => {
    const peer = peersReuniao[de];
    if (peer) {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });

  socketReunioes.on(
    "iceCandidateReuniao",
    async ({ candidate, de }) => {
      const peer = peersReuniao[de];
      if (peer && candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  );

  socketReunioes.on("erroReuniao", ({ mensagem }) => {
    finalizarSalaReuniao(false);
    alert(mensagem || "Não foi possível entrar na reunião.");
  });

  socketReunioes.on("reuniaoEncerrada", ({ reuniaoId }) => {
    if (
      reuniaoAtual &&
      Number(reuniaoAtual.id) === Number(reuniaoId)
    ) {
      finalizarSalaReuniao(true);
      alert("A reunião foi encerrada pelo organizador.");
    }

    carregarReunioes();
  });
}

async function entrarNaReuniao(reuniaoId) {
  if (!socketReunioes || !socketReunioes.connected) {
    alert("A conexão em tempo real ainda não está disponível.");
    return;
  }

  if (
    reuniaoAtual &&
    Number(reuniaoAtual.id) === Number(reuniaoId)
  ) {
    return;
  }

  try {
    const detalhes = await requisicaoReuniao(`/meetings/${reuniaoId}`);

    if (
      !detalhes.organizador &&
      detalhes.convite_status !== "aceito"
    ) {
      conviteAtual = detalhes;
      await abrirConviteReuniao(reuniaoId);
      return;
    }

    if (reuniaoAtual) {
      await finalizarSalaReuniao(true);
    }

    await carregarConfiguracaoIce();

    streamLocalReuniao = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    reuniaoAtual = detalhes;
    microfoneMutado = false;
    abrirSalaReuniao(detalhes);
    socketReunioes.emit("entrarReuniao", reuniaoId);
  } catch (err) {
    console.error("Erro ao entrar na reunião:", err);
    alert(
      err.name === "NotAllowedError"
        ? "Permita o acesso ao microfone para entrar na reunião."
        : err.message
    );
  }
}

function abrirSalaReuniao(detalhes) {
  const sala = document.getElementById("sala-reuniao");
  const grade = document.getElementById("grade-participantes-reuniao");

  if (sala) sala.style.display = "grid";
  if (grade) grade.innerHTML = "";
  document.body.classList.add("meeting-active");

  document.getElementById("sala-reuniao-titulo").innerText = detalhes.titulo;
  document.getElementById("btn-microfone-reuniao").innerText =
    "Desativar microfone";

  const botaoSair = document.getElementById("btn-encerrar-reuniao");
  if (botaoSair) {
    botaoSair.innerText = detalhes.organizador
      ? "Encerrar reunião"
      : "Sair da reunião";
    botaoSair.classList.toggle("is-organizer", detalhes.organizador);
  }

  inicioCronometro = Date.now();
  atualizarCronometroReuniao();
  clearInterval(cronometroReuniao);
  cronometroReuniao = setInterval(atualizarCronometroReuniao, 1000);

  renderizarPainelConvidados(detalhes.convidados || []);
}

function atualizarCronometroReuniao() {
  const elemento = document.getElementById("tempo-reuniao");
  if (!elemento || !inicioCronometro) return;

  const totalSegundos = Math.floor((Date.now() - inicioCronometro) / 1000);
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, "0");
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(
    2,
    "0"
  );
  const segundos = String(totalSegundos % 60).padStart(2, "0");
  elemento.innerText = `${horas}:${minutos}:${segundos}`;
}

async function atualizarDetalhesReuniaoAtual() {
  if (!reuniaoAtual) return;

  try {
    const detalhes = await requisicaoReuniao(
      `/meetings/${reuniaoAtual.id}`
    );
    reuniaoAtual = { ...reuniaoAtual, ...detalhes };
    renderizarPainelConvidados(detalhes.convidados || []);
  } catch (err) {
    console.error(err);
  }
}

function renderizarPainelConvidados(convidados) {
  const lista = document.getElementById("participantes-reuniao-lista");
  if (!lista) return;

  lista.innerHTML = "";

  convidados.forEach((convidado) => {
    const item = document.createElement("div");
    item.classList.add("meeting-attendee-row");

    const avatar = document.createElement("span");
    avatar.classList.add("meeting-attendee-avatar");
    avatar.innerText = gerarIniciais(convidado.nome);

    const copy = document.createElement("span");
    const nome = document.createElement("strong");
    nome.innerText = convidado.nome;
    const status = document.createElement("small");
    status.innerText = convidado.ativo
      ? "Na reunião"
      : {
          aceito: "Convite aceito",
          pendente: "Aguardando resposta",
          recusado: "Convite recusado",
        }[convidado.status] || "Convidado";

    copy.appendChild(nome);
    copy.appendChild(status);
    item.appendChild(avatar);
    item.appendChild(copy);
    lista.appendChild(item);
  });
}

function adicionarParticipanteSala({
  socketId,
  usuarioId,
  nome,
  mutado = false,
  souEu = false,
}) {
  if (!socketId) return;

  const grade = document.getElementById("grade-participantes-reuniao");
  if (!grade) return;

  let tile = grade.querySelector(`[data-socket-id="${socketId}"]`);
  if (tile) {
    atualizarEstadoMicrofoneParticipante(socketId, mutado);
    return;
  }

  tile = document.createElement("article");
  tile.classList.add("meeting-participant-tile");
  tile.dataset.socketId = socketId;
  tile.dataset.usuarioId = usuarioId;

  const avatar = document.createElement("span");
  avatar.classList.add("meeting-participant-avatar");
  avatar.innerText = gerarIniciais(nome);
  avatar.style.background = gerarCorUsuario(nome);

  const rodape = document.createElement("div");
  rodape.classList.add("meeting-participant-footer");
  const nomeElemento = document.createElement("strong");
  nomeElemento.innerText = souEu ? `${nome} (você)` : nome;
  const mic = document.createElement("span");
  mic.classList.add("meeting-mic-state");
  mic.innerText = mutado ? "Mudo" : "Microfone ativo";

  rodape.appendChild(nomeElemento);
  rodape.appendChild(mic);
  tile.appendChild(avatar);
  tile.appendChild(rodape);
  grade.appendChild(tile);
}

function removerParticipanteSala(socketId) {
  document
    .querySelector(
      `#grade-participantes-reuniao [data-socket-id="${socketId}"]`
    )
    ?.remove();
}

function atualizarEstadoMicrofoneParticipante(socketId, mutado) {
  const tile = document.querySelector(
    `#grade-participantes-reuniao [data-socket-id="${socketId}"]`
  );
  const estado = tile?.querySelector(".meeting-mic-state");

  if (tile) tile.classList.toggle("is-muted", Boolean(mutado));
  if (estado) estado.innerText = mutado ? "Mudo" : "Microfone ativo";
}

function atualizarContadorParticipantes() {
  const total = document.querySelectorAll(
    "#grade-participantes-reuniao .meeting-participant-tile"
  ).length;
  const contador = document.getElementById("contador-participantes-reuniao");
  if (contador) contador.innerText = String(total);
}

async function criarPeerReuniao(socketId, iniciador) {
  if (!socketId || socketId === socketReunioes?.id) return null;
  if (peersReuniao[socketId]) return peersReuniao[socketId];

  const peer = new RTCPeerConnection(configuracaoIceReuniao);
  peersReuniao[socketId] = peer;

  streamLocalReuniao?.getTracks().forEach((track) => {
    peer.addTrack(track, streamLocalReuniao);
  });

  peer.onicecandidate = (event) => {
    if (event.candidate && socketReunioes?.connected) {
      socketReunioes.emit("iceCandidateReuniao", {
        candidate: event.candidate,
        para: socketId,
      });
    }
  };

  peer.ontrack = (event) => {
    const stream = event.streams?.[0];
    if (stream) adicionarAudioReuniao(socketId, stream);
  };

  peer.onconnectionstatechange = () => {
    if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
      removerAudioReuniao(socketId);
    }
  };

  if (iniciador) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketReunioes.emit("offerReuniao", { offer, para: socketId });
  }

  return peer;
}

function adicionarAudioReuniao(socketId, stream) {
  let audio = document.getElementById(`audio-reuniao-${socketId}`);

  if (!audio) {
    audio = document.createElement("audio");
    audio.id = `audio-reuniao-${socketId}`;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.dataset.reuniaoAudio = "true";
    document.body.appendChild(audio);
  }

  audio.srcObject = stream;
  audio.play().catch((err) => {
    console.warn("O navegador bloqueou o áudio da reunião:", err);
  });
}

function removerAudioReuniao(socketId) {
  const audio = document.getElementById(`audio-reuniao-${socketId}`);
  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }

  if (peersReuniao[socketId]) {
    peersReuniao[socketId].close();
    delete peersReuniao[socketId];
  }
}

function toggleMicrofoneReuniao() {
  if (!streamLocalReuniao) return;

  microfoneMutado = !microfoneMutado;
  streamLocalReuniao.getAudioTracks().forEach((track) => {
    track.enabled = !microfoneMutado;
  });

  const botao = document.getElementById("btn-microfone-reuniao");
  if (botao) {
    botao.innerText = microfoneMutado
      ? "Ativar microfone"
      : "Desativar microfone";
    botao.classList.toggle("is-muted", microfoneMutado);
  }

  atualizarEstadoMicrofoneParticipante(
    socketReunioes.id,
    microfoneMutado
  );
  socketReunioes.emit("alterarMudoReuniao", microfoneMutado);
}

function togglePainelParticipantes() {
  document
    .getElementById("painel-participantes-reuniao")
    ?.classList.toggle("is-open");
}

async function encerrarOuSairReuniao() {
  if (!reuniaoAtual) return;

  if (reuniaoAtual.organizador) {
    const confirmou = confirm(
      "Encerrar a reunião para todos os participantes?"
    );
    if (!confirmou) return;

    try {
      await requisicaoReuniao(
        `/meetings/${reuniaoAtual.id}/encerrar`,
        { method: "POST" }
      );
      await finalizarSalaReuniao(true);
      await carregarReunioes();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  await finalizarSalaReuniao(true);
}

async function finalizarSalaReuniao(notificarServidor = true) {
  if (notificarServidor && reuniaoAtual && socketReunioes?.connected) {
    socketReunioes.emit("sairReuniao");
  }

  Object.values(peersReuniao).forEach((peer) => peer?.close());
  peersReuniao = {};

  streamLocalReuniao?.getTracks().forEach((track) => track.stop());
  streamLocalReuniao = null;

  document.querySelectorAll("audio[data-reuniao-audio='true']").forEach(
    (audio) => audio.remove()
  );

  clearInterval(cronometroReuniao);
  cronometroReuniao = null;
  inicioCronometro = null;
  microfoneMutado = false;
  reuniaoAtual = null;

  const sala = document.getElementById("sala-reuniao");
  const grade = document.getElementById("grade-participantes-reuniao");
  if (sala) sala.style.display = "none";
  if (grade) grade.innerHTML = "";
  document.body.classList.remove("meeting-active");
  document
    .getElementById("painel-participantes-reuniao")
    ?.classList.remove("is-open");

  atualizarContadorParticipantes();
  await carregarReunioes();
}

window.addEventListener("beehive:socket-ready", (event) => {
  configurarSocketReunioes(event.detail.socket);
});

document.addEventListener("DOMContentLoaded", () => {
  carregarReunioes();

  if (window.socket) {
    configurarSocketReunioes(window.socket);
  }
});

window.addEventListener("beforeunload", () => {
  if (reuniaoAtual && socketReunioes?.connected) {
    socketReunioes.emit("sairReuniao");
  }

  streamLocalReuniao?.getTracks().forEach((track) => track.stop());
});
