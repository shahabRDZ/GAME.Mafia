/* ── Shared Application State ── */

let currentUser = null;
let authToken = localStorage.getItem("mafiaToken") || null;
let authMode = "login";

let state = {
  group: null,
  count: null,
  mafiaCount: null,
  citizenCount: null,
  cards: [],
  flipped: new Set(),
  seen: new Set(),
  isCustom: false
};

let customCardsList = [];
let selectedTeam = "mafia";

// CHAOS mode state
let chaosState = {
  roomCode: null,
  players: [],
  myRole: null,
  phase: null,
  phaseEndAt: null,
  messages: [],
  isHost: false,
  myVote: null
};
