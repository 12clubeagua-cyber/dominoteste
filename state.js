/* 
   ESTADO GLOBAL E CONFIGURACOES (state.js)
 */

let STATE = {
  hands: [[], [], [], []],                
  extremes: [null, null],   
  current: 0,               
  scores: [0, 0],           
  pendingIdx: null,         
  isBlocked: false,         
  isOver: false,            
  matchOver: false,         // New flag for entire match termination
  isShuffling: false,       
  roundWinner: null,        
  lastPlayed: null,         
  positions: [],            
  passCount: 0,             
  playerPassed: [false, false, false, false],
  ends: [],                 
  playerMemory: [[], [], [], []], 
  handSize: [7, 7, 7, 7],   
  targetScore: 1,           
  difficulty: 'normal',     
  autoNextInterval: null,
  turnTimer: null    // Timer for pending turn execution
};

// Contexto de audio (iniciado apos o primeiro clique do usuario)
let audioCtx = null;

// Variaveis de Rede / Multiplayer
let netMode = 'offline';      // 'offline', 'host' ou 'client'
let myPlayerIdx = 0;          // Sua posicao na mesa (Host  sempre 0)
let myPeer = null;            // Objeto PeerJS
let myConnToHost = null;      // conexao do Cliente com o Host
let connectedClients = [];    // Lista de conexoes que o Host mantem
let client_predicted = false; // Controle de latencia para jogadas locais

// Reconexao
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000; // 3s entre tentativas
let reconnectTimer = null;
let lastRoomCode = null;     // Guarda o codigo da sala para reconectar
let lastPlayerIdx = null;    // Guarda o indice do jogador para restaurar
let isReconnecting = false;

window.visualPass = [false, false, false, false];

function clearTurnTimer() {
    if (STATE.turnTimer) {
        clearTimeout(STATE.turnTimer);
        STATE.turnTimer = null;
    }
}

function resetReconnect() {
    reconnectAttempts = 0;
    isReconnecting = false;
}



