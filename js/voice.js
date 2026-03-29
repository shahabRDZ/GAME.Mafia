/* ── WebRTC Voice Chat ── */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
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
    voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupLocalSpeakingDetection();
    updateVoiceUI();

    // Notify others that I joined voice
    if (socket && chaosState.roomCode) {
      socket.emit("voice_join", { code: chaosState.roomCode });
    }

    const myId = currentUser ? currentUser.id : 0;
    chaosState.players.forEach(p => {
      if (p.user_id !== myId) createPeerConnection(p.user_id, true);
    });

    showToast("🎙️ ویس فعال شد");
  } catch (err) {
    showToast("⚠️ دسترسی میکروفون رد شد");
  }
}

function stopVoiceChat() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  if (speakingCheckInterval) { clearInterval(speakingCheckInterval); speakingCheckInterval = null; }
  remoteIntervals.forEach(id => clearInterval(id));
  remoteIntervals = [];
  if (voiceAudioCtx) { try { voiceAudioCtx.close(); } catch(e){} voiceAudioCtx = null; }
  localAnalyser = null;
  voiceEnabled = false;
  voiceMuted = false;
  document.querySelectorAll(".player-circle").forEach(el => el.classList.remove("speaking"));
  document.querySelectorAll("audio[id^='voice-audio-']").forEach(el => el.remove());
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
  const source = voiceAudioCtx.createMediaStreamSource(localStream);
  localAnalyser = voiceAudioCtx.createAnalyser();
  localAnalyser.fftSize = 256;
  source.connect(localAnalyser);
  const data = new Uint8Array(localAnalyser.frequencyBinCount);
  speakingCheckInterval = setInterval(() => {
    if (!localAnalyser || voiceMuted) { setPlayerSpeaking(currentUser?.id, false); return; }
    localAnalyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setPlayerSpeaking(currentUser?.id, avg > 15);
  }, 200);
}

function createPeerConnection(targetUserId, isInitiator) {
  // Close existing connection if any
  if (peerConnections[targetUserId]) {
    peerConnections[targetUserId].close();
    delete peerConnections[targetUserId];
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections[targetUserId] = pc;
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = (event) => {
    const stream = event.streams[0];

    // Remove old audio element
    const old = document.getElementById("voice-audio-" + targetUserId);
    if (old) old.remove();

    // Create audio element and play (with user gesture workaround)
    const audio = document.createElement("audio");
    audio.id = "voice-audio-" + targetUserId;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.volume = 1.0;
    document.body.appendChild(audio);

    // Force play (workaround for autoplay policy)
    const playPromise = audio.play();
    if (playPromise) playPromise.catch(() => {
      // Retry on next user interaction
      const retryPlay = () => { audio.play(); document.removeEventListener("click", retryPlay); };
      document.addEventListener("click", retryPlay);
    });

    // Remote speaking detection
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
          setPlayerSpeaking(targetUserId, avg > 15);
        }, 200);
        remoteIntervals.push(intId);
      } catch(e){}
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit("voice_ice", { target_user_id: targetUserId, candidate: event.candidate.toJSON() });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") {
      // Retry connection
      pc.close();
      delete peerConnections[targetUserId];
      setTimeout(() => {
        if (voiceEnabled) createPeerConnection(targetUserId, true);
      }, 2000);
    }
  };

  if (isInitiator) {
    pc.createOffer({ offerToReceiveAudio: true }).then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      socket.emit("voice_offer", { target_user_id: targetUserId, offer: pc.localDescription });
    }).catch(() => {});
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
    if (!voiceEnabled || !localStream) return;
    const pc = createPeerConnection(data.from_user_id, false);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice_answer", { target_user_id: data.from_user_id, answer: pc.localDescription });
    } catch(e) { console.error("Voice offer error:", e); }
  });

  socket.on("voice_answer", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc && pc.signalingState !== "stable") {
      try { await pc.setRemoteDescription(new RTCSessionDescription(data.answer)); }
      catch(e) { console.error("Voice answer error:", e); }
    }
  });

  socket.on("voice_ice", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc && pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
      catch(e) {}
    }
  });

  // When another player joins voice, connect to them
  socket.on("voice_peer_joined", (data) => {
    if (voiceEnabled && localStream && data.user_id !== (currentUser?.id)) {
      setTimeout(() => createPeerConnection(data.user_id, true), 500);
    }
  });
}
