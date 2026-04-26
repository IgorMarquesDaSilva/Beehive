let localStream = null;
let peers = {};
let canalVozAtual = null;
let mutado = false;
let chamadaDeSocketId = null;

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ========== CANAL DE VOZ ==========
async function entrarVoz(canalId, nomCanal) {
  if (canalVozAtual) {
    await sairVoz();
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert("Não foi possível acessar o microfone.");
    return;
  }

  canalVozAtual = canalId;
  mutado = false;

  document.getElementById("voz-painel").style.display = "block";
  document.getElementById("voz-titulo").innerText = `🎙️ # ${nomCanal}`;
  document.getElementById("btn-mute").innerText = "🎙️ Mudo";

  socket.emit("entrarVoz", canalId);
}

async function sairVoz() {
  if (!canalVozAtual) return;

  socket.emit("sairVoz", canalVozAtual);

  Object.values(peers).forEach((peer) => peer.close());
  peers = {};

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  canalVozAtual = null;
  document.getElementById("voz-painel").style.display = "none";
  document.getElementById("voz-membros").innerHTML = "";
  atualizarBotoesVoz();
}

function toggleMute() {
  if (!localStream) return;
  mutado = !mutado;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !mutado));
  document.getElementById("btn-mute").innerText = mutado ? "🔇 Desmutado" : "🎙️ Mudo";
}

async function criarPeer(socketId, iniciador) {
  const peer = new RTCPeerConnection(iceServers);
  peers[socketId] = peer;

  localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("iceCandidate", { candidate: e.candidate, para: socketId });
    }
  };

  peer.ontrack = (e) => {
    adicionarAudio(socketId, e.streams[0]);
  };

  if (iniciador) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", { offer, para: socketId });
  }

  return peer;
}

function adicionarAudio(socketId, stream) {
  let audio = document.getElementById(`audio-${socketId}`);
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = `audio-${socketId}`;
    audio.autoplay = true;
    document.body.appendChild(audio);
  }
  audio.srcObject = stream;
}

function removerAudio(socketId) {
  const audio = document.getElementById(`audio-${socketId}`);
  if (audio) audio.remove();
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }
}

function adicionarMembroVoz(nome, socketId) {
  const div = document.createElement("div");
  div.classList.add("voz-membro");
  div.id = `membro-${socketId}`;
  div.innerHTML = `<span class="voz-avatar">${nome[0].toUpperCase()}</span><span>${nome}</span>`;
  document.getElementById("voz-membros").appendChild(div);
}

function removerMembroVoz(socketId) {
  const el = document.getElementById(`membro-${socketId}`);
  if (el) el.remove();
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

// ========== CHAMADA PRIVADA ==========
let chamadaParaSocketId = null;

function iniciarChamadaPrivada(paraSocketId, nomeUsuario) {
  chamadaParaSocketId = paraSocketId;
  socket.emit("chamarUsuario", { paraSocketId, nome: nomeUsuario });
  alert(`Chamando ${nomeUsuario}...`);
}

function aceitarChamada() {
  document.getElementById("modal-chamada").style.display = "none";
  document.getElementById("modal-chamada-overlay").style.display = "none";

  socket.emit("aceitarChamada", { paraSocketId: chamadaDeSocketId });

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    localStream = stream;
    criarPeer(chamadaDeSocketId, false);
  });
}

function recusarChamada() {
  document.getElementById("modal-chamada").style.display = "none";
  document.getElementById("modal-chamada-overlay").style.display = "none";
  socket.emit("recusarChamada", { paraSocketId: chamadaDeSocketId });
  chamadaDeSocketId = null;
}

// ========== EVENTOS DO SOCKET ==========
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

// ========== MEMBROS DO CANAL DE VOZ ==========
async function carregarMembrosVoz(canalId) {
  const res = await fetch(`/chat/voz/${canalId}`, { credentials: "include" });
  const membros = await res.json();

  const lista = document.getElementById("lista-voz");
  lista.innerHTML = "";

  membros.forEach((m) => {
    const div = document.createElement("div");
    div.classList.add("canal-item", "voz-item");
    div.innerHTML = `
      <span>🔊 ${m.nome}</span>
    `;
    lista.appendChild(div);
  });
}