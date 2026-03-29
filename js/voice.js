/* ── WebRTC Voice Chat ── */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" }
];

let localStream = null;
let peerConnections = {};
let voiceEnabled = false;
let voiceMuted = false;
let voiceAudioCtx = null;
let localAnalyser = null;
let speakingCheckInterval = null;
let remoteIntervals = [];

async function startVoiceChat() {
  if (voiceEnabled) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    voiceEnabled = true;
    voiceMuted = false;
    updateVoiceUI();

    // Resume or create AudioContext (must be after user gesture)
    if (!voiceAudioCtx || voiceAudioCtx.state === "closed") {
      voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (voiceAudioCtx.state === "suspended") await voiceAudioCtx.resume();

    setupLocalSpeakingDetection();

    // Notify others
    if (socket && chaosState.roomCode) {
      socket.emit("voice_join", { code: chaosState.roomCode });
    }

    // Connect to all other players
    const myId = currentUser ? currentUser.id : 0;
    chaosState.players.forEach(p => {
      if (p.user_id !== myId) {
        console.log("[Voice] Connecting to player:", p.username, p.user_id);
        createPeerConnection(p.user_id, true);
      }
    });

    showToast("🎙️ ویس فعال شد");
  } catch (err) {
    console.error("[Voice] Mic error:", err);
    showToast("⚠️ دسترسی میکروفون رد شد");
  }
}

function stopVoiceChat() {
  console.log("[Voice] Stopping voice chat");
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  Object.keys(peerConnections).forEach(uid => {
    peerConnections[uid].close();
    const audio = document.getElementById("voice-audio-" + uid);
    if (audio) audio.remove();
  });
  peerConnections = {};
  if (speakingCheckInterval) { clearInterval(speakingCheckInterval); speakingCheckInterval = null; }
  remoteIntervals.forEach(id => clearInterval(id));
  remoteIntervals = [];
  if (voiceAudioCtx) { try { voiceAudioCtx.close(); } catch(e){} voiceAudioCtx = null; }
  localAnalyser = null;
  voiceEnabled = false;
  voiceMuted = false;
  document.querySelectorAll(".player-circle").forEach(el => el.classList.remove("speaking"));
  updateVoiceUI();
}

function toggleVoiceMute() {
  if (!localStream) return;
  voiceMuted = !voiceMuted;
  localStream.getAudioTracks().forEach(t => { t.enabled = !voiceMuted; });
  updateVoiceUI();
  showToast(voiceMuted ? "🔇 صدا قطع شد" : "🎤 صدا فعال شد");
}

function setupLocalSpeakingDetection() {
  if (!voiceAudioCtx || !localStream) return;
  try {
    const source = voiceAudioCtx.createMediaStreamSource(localStream);
    localAnalyser = voiceAudioCtx.createAnalyser();
    localAnalyser.fftSize = 256;
    source.connect(localAnalyser);
    const data = new Uint8Array(localAnalyser.frequencyBinCount);
    speakingCheckInterval = setInterval(() => {
      if (!localAnalyser || voiceMuted) { setPlayerSpeaking(currentUser?.id, false); return; }
      localAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setPlayerSpeaking(currentUser?.id, avg > 12);
    }, 200);
  } catch(e) { console.error("[Voice] Analyser error:", e); }
}

function createPeerConnection(targetUserId, isInitiator) {
  console.log("[Voice] createPeerConnection to", targetUserId, "initiator:", isInitiator);

  // Close existing
  if (peerConnections[targetUserId]) {
    try { peerConnections[targetUserId].close(); } catch(e){}
    delete peerConnections[targetUserId];
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections[targetUserId] = pc;

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(t => {
      pc.addTrack(t, localStream);
      console.log("[Voice] Added local track:", t.kind);
    });
  }

  // Receive remote audio
  pc.ontrack = (event) => {
    console.log("[Voice] Got remote track from", targetUserId);
    const stream = event.streams[0];

    const old = document.getElementById("voice-audio-" + targetUserId);
    if (old) old.remove();

    const audio = document.createElement("audio");
    audio.id = "voice-audio-" + targetUserId;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.volume = 1.0;
    document.body.appendChild(audio);

    // Force play
    audio.play().then(() => {
      console.log("[Voice] Playing audio from", targetUserId);
    }).catch(err => {
      console.warn("[Voice] Autoplay blocked, retrying on click");
      const retry = () => { audio.play(); document.removeEventListener("click", retry); document.removeEventListener("touchstart", retry); };
      document.addEventListener("click", retry);
      document.addEventListener("touchstart", retry);
    });

    // Speaking detection
    if (voiceAudioCtx && voiceAudioCtx.state !== "closed") {
      try {
        const source = voiceAudioCtx.createMediaStreamSource(stream);
        const analyser = voiceAudioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const intId = setInterval(() => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setPlayerSpeaking(targetUserId, avg > 12);
        }, 200);
        remoteIntervals.push(intId);
      } catch(e) { console.error("[Voice] Remote analyser error:", e); }
    }
  };

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      console.log("[Voice] Sending ICE candidate to", targetUserId);
      socket.emit("voice_ice", { target_user_id: targetUserId, candidate: event.candidate.toJSON() });
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("[Voice] ICE state with", targetUserId, ":", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      console.log("[Voice] Retrying connection to", targetUserId);
      try { pc.close(); } catch(e){}
      delete peerConnections[targetUserId];
      if (voiceEnabled) setTimeout(() => createPeerConnection(targetUserId, true), 2000);
    }
  };

  // Create offer if initiator
  if (isInitiator) {
    pc.createOffer({ offerToReceiveAudio: true }).then(offer => {
      console.log("[Voice] Created offer for", targetUserId);
      return pc.setLocalDescription(offer);
    }).then(() => {
      socket.emit("voice_offer", { target_user_id: targetUserId, offer: pc.localDescription.toJSON() });
    }).catch(err => console.error("[Voice] Offer error:", err));
  }

  return pc;
}

function setPlayerSpeaking(userId, speaking) {
  const el = document.getElementById("pc-" + userId);
  if (el) el.classList.toggle("speaking", speaking);
}

function updateVoiceUI() {
  const btn = document.getElementById("voiceToggleBtn");
  if (!btn) return;
  if (!voiceEnabled) { btn.innerHTML = '🎙️'; btn.className = 'voice-btn voice-off'; }
  else if (voiceMuted) { btn.innerHTML = '🔇'; btn.className = 'voice-btn voice-muted'; }
  else { btn.innerHTML = '🎤'; btn.className = 'voice-btn voice-on'; }
}

function setupVoiceSocketEvents() {
  if (!socket) return;

  socket.on("voice_offer", async (data) => {
    console.log("[Voice] Received offer from", data.from_user_id);
    // If voice not enabled, show toast to user instead of auto-enabling
    if (!voiceEnabled || !localStream) {
      showToast("🎙️ بازیکن دیگر ویس فعال کرد — دکمه 🎙️ را بزنید");
      return;
    }
    try {
      const pc = createPeerConnection(data.from_user_id, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[Voice] Sending answer to", data.from_user_id);
      socket.emit("voice_answer", { target_user_id: data.from_user_id, answer: pc.localDescription.toJSON() });
    } catch(e) { console.error("[Voice] Handle offer error:", e); }
  });

  socket.on("voice_answer", async (data) => {
    console.log("[Voice] Received answer from", data.from_user_id);
    const pc = peerConnections[data.from_user_id];
    if (pc && pc.signalingState === "have-local-offer") {
      try { await pc.setRemoteDescription(new RTCSessionDescription(data.answer)); }
      catch(e) { console.error("[Voice] Handle answer error:", e); }
    }
  });

  socket.on("voice_ice", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc && pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
      catch(e) {}
    }
  });

  socket.on("voice_peer_joined", (data) => {
    console.log("[Voice] Peer joined voice:", data.username, data.user_id);
    if (voiceEnabled && localStream && data.user_id !== (currentUser?.id)) {
      setTimeout(() => createPeerConnection(data.user_id, true), 1000);
    }
  });
}
