let localStream = null;
let peers = {};
let canalVozAtual = null;
let mutado = false;
let chamadaDeSocketId = null;
let chamadaParaSocketId = null;

const iceServers = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "cbd6f9ec1800a701202dfcc3",
      credential: "0Mdgl8Y8vKqP0eNy",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "cbd6f9ec1800a701202dfcc3",
      credential: "0Mdgl8Y8vKqP0eNy",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "cbd6f9ec1800a701202dfcc3",
      credential: "0Mdgl8Y8vKqP0eNy",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "cbd6f9ec1800a701202dfcc3",
      credential: "0Mdgl8Y8vKqP0eNy",
    },
  ],
};

async function entrarVoz(canalId, nomeCanal) {
  if (!socket || !socket.connected) {
    alert("Você precisa estar conectado para entrar na voz.");
    return;
  }

  if (canalVozAtual && Number(canalVozAtual) === Number(canalId)) {
    await sairVoz();
    return;
  }

  if (canalVozAtual) {
    await sairVoz();
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  } catch (err) {
    console.error("Erro ao acessar microfone:", err);
    alert("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    return;
  }

  canalVozAtual = canalId;
  mutado = false;

  const painel = document.getElementById("voz-painel");
  const titulo = document.getElementById("voz-titulo");
  const btnMute = document.getElementById("btn-mute");
  const membros = document.getElementById("voz-membros");

  if (painel) painel.style.display = "flex";
  if (titulo) titulo.innerText = `🎙️ # ${nomeCanal}`;
  if (btnMute) btnMute.innerText = "🎙️ Ativo";
  if (membros) membros.innerHTML = "";

  adicionarMembroVoz(usuario.nome, socket.id, true);

  socket.emit("entrarVoz", canalId);

  atualizarBotoesVoz();
}

async function sairVoz() {
  if (!canalVozAtual) return;

  if (socket && socket.connected) {
    socket.emit("sairVoz", canalVozAtual);
  }

  Object.values(peers).forEach((peer) => {
    if (peer) peer.close();
  });

  peers = {};

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  document.querySelectorAll("audio[data-voz='true']").forEach((audio) => {
    audio.remove();
  });

  canalVozAtual = null;
  mutado = false;

  const painel = document.getElementById("voz-painel");
  const membros = document.getElementById("voz-membros");

  if (painel) painel.style.display = "none";
  if (membros) membros.innerHTML = "";

  atualizarBotoesVoz();
}

function toggleMute() {
  if (!localStream) return;

  mutado = !mutado;

  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !mutado;
  });

  const btnMute = document.getElementById("btn-mute");

  if (btnMute) {
    btnMute.innerText = mutado ? "🔇 Mudo" : "🎙️ Ativo";
  }
}

async function criarPeer(socketId, iniciador) {
  if (!socketId || socketId === socket.id) return null;

  if (peers[socketId]) {
    return peers[socketId];
  }

  const peer = new RTCPeerConnection(iceServers);
  peers[socketId] = peer;

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });
  }

  peer.onicecandidate = (event) => {
    if (event.candidate && socket && socket.connected) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        para: socketId,
      });
    }
  };

  peer.ontrack = (event) => {
    const stream = event.streams && event.streams[0];

    if (stream) {
      adicionarAudio(socketId, stream);
    }
  };

  peer.onconnectionstatechange = () => {
    if (
      peer.connectionState === "failed" ||
      peer.connectionState === "disconnected" ||
      peer.connectionState === "closed"
    ) {
      removerAudio(socketId);
      removerMembroVoz(socketId);
    }
  };

  if (iniciador) {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("offer", {
        offer,
        para: socketId,
      });
    } catch (err) {
      console.error("Erro ao criar offer:", err);
    }
  }

  return peer;
}

function adicionarAudio(socketId, stream) {
  let audio = document.getElementById(`audio-${socketId}`);

  if (!audio) {
    audio = document.createElement("audio");
    audio.id = `audio-${socketId}`;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.setAttribute("data-voz", "true");
    document.body.appendChild(audio);
  }

  audio.srcObject = stream;

  audio.play().catch((err) => {
    console.warn("O navegador bloqueou o autoplay do áudio:", err);
  });
}

function removerAudio(socketId) {
  const audio = document.getElementById(`audio-${socketId}`);

  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }

  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }
}

function adicionarMembroVoz(nome, socketId, souEu = false) {
  if (!socketId) return;

  const lista = document.getElementById("voz-membros");
  if (!lista) return;

  const existing = document.getElementById(`membro-${socketId}`);
  if (existing) return;

  const div = document.createElement("div");
  div.classList.add("voz-membro");
  div.id = `membro-${socketId}`;

  const avatar = document.createElement("span");
  avatar.classList.add("voz-avatar");
  avatar.innerText = nome ? nome.charAt(0).toUpperCase() : "?";

  const nomeSpan = document.createElement("span");
  nomeSpan.innerText = souEu ? `${nome} (você)` : nome;

  div.appendChild(avatar);
  div.appendChild(nomeSpan);

  lista.appendChild(div);
}

function removerMembroVoz(socketId) {
  const el = document.getElementById(`membro-${socketId}`);

  if (el) {
    el.remove();
  }
}

function atualizarBotoesVoz() {
  document.querySelectorAll(".btn-entrar-voz").forEach((btn) => {
    const canalId = btn.getAttribute("data-canal-id");

    if (Number(canalId) === Number(canalVozAtual)) {
      btn.innerText = "✅ Conectado";
      btn.style.color = "#2ecc71";
    } else {
      btn.innerText = "🎙️ Entrar";
      btn.style.color = "#f5a623";
    }
  });
}

async function carregarMembrosVoz(canalId) {
  if (!canalId) return;

  try {
    const res = await fetch(`/chat/voz/${canalId}`, {
      credentials: "include",
    });

    if (!res.ok) return;

    const membros = await res.json();

    const lista = document.getElementById("lista-voz");
    if (!lista) return;

    lista.innerHTML = "";

    membros.forEach((m) => {
      const div = document.createElement("div");
      div.classList.add("canal-item", "voz-item");

      const span = document.createElement("span");
      span.innerText = `🔊 ${m.nome}`;

      div.appendChild(span);
      lista.appendChild(div);
    });
  } catch (err) {
    console.error("Erro ao carregar membros da voz:", err);
  }
}

function aceitarChamada() {
  const modal = document.getElementById("modal-chamada");
  const overlay = document.getElementById("modal-chamada-overlay");

  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";

  if (!chamadaDeSocketId) return;

  socket.emit("aceitarChamada", {
    paraSocketId: chamadaDeSocketId,
  });

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .then((stream) => {
      localStream = stream;
      criarPeer(chamadaDeSocketId, false);
    })
    .catch((err) => {
      console.error("Erro ao aceitar chamada:", err);
      alert("Não foi possível acessar o microfone.");
    });
}

function recusarChamada() {
  const modal = document.getElementById("modal-chamada");
  const overlay = document.getElementById("modal-chamada-overlay");

  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";

  if (chamadaDeSocketId) {
    socket.emit("recusarChamada", {
      paraSocketId: chamadaDeSocketId,
    });
  }

  chamadaDeSocketId = null;
}

window.addEventListener("beforeunload", () => {
  if (canalVozAtual && socket && socket.connected) {
    socket.emit("sairVoz", canalVozAtual);
  }
});