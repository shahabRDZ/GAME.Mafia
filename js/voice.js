/* ── WebRTC Voice Chat ── */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

let localStream = null;
let peerConnections = {};  // user_id -> RTCPeerConnection
let voiceEnabled = false;
let voiceMuted = false;

async function startVoiceChat() {
  if (voiceEnabled) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    voiceEnabled = true;
    voiceMuted = false;
    updateVoiceUI();

    // Connect to all other players in the room
    const myId = currentUser ? currentUser.id : 0;
    chaosState.players.forEach(p => {
      if (p.user_id !== myId) createPeerConnection(p.user_id, true);
    });

    showToast("🎙️ ویس چت فعال شد");
  } catch (err) {
    showToast("⚠️ دسترسی میکروفون رد شد");
    console.error("Mic error:", err);
  }
}

function stopVoiceChat() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  voiceEnabled = false;
  voiceMuted = false;
  updateVoiceUI();
}

function toggleVoiceMute() {
  if (!localStream) return;
  voiceMuted = !voiceMuted;
  localStream.getAudioTracks().forEach(t => { t.enabled = !voiceMuted; });
  updateVoiceUI();
}

function createPeerConnection(targetUserId, isInitiator) {
  if (peerConnections[targetUserId]) return peerConnections[targetUserId];

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections[targetUserId] = pc;

  // Add local audio stream
  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }

  // Handle remote audio
  pc.ontrack = (event) => {
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    audio.id = "voice-audio-" + targetUserId;
    // Remove old audio element if exists
    const old = document.getElementById("voice-audio-" + targetUserId);
    if (old) old.remove();
    document.body.appendChild(audio);
  };

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit("voice_ice", {
        target_user_id: targetUserId,
        candidate: event.candidate.toJSON()
      });
    }
  };

  // If initiator, create offer
  if (isInitiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("voice_offer", { target_user_id: targetUserId, offer: offer });
    });
  }

  return pc;
}

function updateVoiceUI() {
  const btn = document.getElementById("voiceToggleBtn");
  if (!btn) return;
  if (!voiceEnabled) {
    btn.innerHTML = '🎙️ ویس';
    btn.className = 'voice-btn voice-off';
  } else if (voiceMuted) {
    btn.innerHTML = '🔇 قطع صدا';
    btn.className = 'voice-btn voice-muted';
  } else {
    btn.innerHTML = '🎤 در حال صحبت';
    btn.className = 'voice-btn voice-on';
  }
}

// ── Socket event handlers for WebRTC signaling ──
function setupVoiceSocketEvents() {
  if (!socket) return;

  socket.on("voice_offer", async (data) => {
    const pc = createPeerConnection(data.from_user_id, false);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("voice_answer", { target_user_id: data.from_user_id, answer: answer });
  });

  socket.on("voice_answer", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  });

  socket.on("voice_ice", async (data) => {
    const pc = peerConnections[data.from_user_id];
    if (pc) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
      catch (e) { console.error("ICE error:", e); }
    }
  });
}
