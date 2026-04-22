/* ═══════════════════════════════════════════════════════
   ESTADO GLOBAL E REDE (state.js)
═══════════════════════════════════════════════════════ */
let STATE = {
  hands: [],
  extremes: [null, null],
  current: 0,
  scores: [0, 0],
  pendingIdx: null,
  isBlocked: false,
  isOver: false,
  roundWinner: null,
  positions: [],
  passCount: 0,
  playerPassed: [false, false, false, false],
  ends: [],
  playerMemory: [[], [], [], []],
  handSize: [7, 7, 7, 7],
  targetScore: 1,
  difficulty: 'normal',
  autoNextInterval: null
};

const NAMES = ["JOGADOR 1", "JOGADOR 2", "JOGADOR 3", "JOGADOR 4"];
let audioCtx = null;

let netMode = 'offline'; 
let myPlayerIdx = 0; 
let myPeer = null;
let myConnToHost = null; 
let connectedClients = []; 
let client_predicted = false;

window.visualPass = [false, false, false, false];
window.minScaleReached = 1.2;
window.currentSnakeScale = 1.2;
window.currentSnakeCx = 0;
window.currentSnakeCy = 0;