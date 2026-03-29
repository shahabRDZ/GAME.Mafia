/* ── WebRTC Voice Chat ── */

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

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
  if (peerConnections[targetUserId]) return peerConnections[targetUserId];
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections[targetUserId] = pc;
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.id = "voice-audio-" + targetUserId;
    const old = document.getElementById("voice-audio-" + targetUserId);
    if (old) old.remove();
    document.body.appendChild(audio);
    // Remote speaking detection using shared AudioContext
    if (voiceAudioCtx) {
      try {
        const source = voiceAudioCtx.createMediaStreamSource(stream);
        const analyser = voiceAudioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const intId = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
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

  if (isInitiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("voice_offer", { target_user_id: targetUserId, offer });
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
    const pc = createPeerConnection(data.from_user_id, false);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("voice_answer", { target_user_id: data.from_user_id, answer });
  });
  socket.on("voice_answer", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  });
  socket.on("voice_ice", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc) try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(e){}
  });
}
