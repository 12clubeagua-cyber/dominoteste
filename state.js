/* ═══════════════════════════════════════════════════════
   ESTADO GLOBAL E CONFIGURAÇÕES (state.js)
═══════════════════════════════════════════════════════ */

let STATE = {
  hands: [],                
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
  autoNextInterval: null    
};

// Contexto de áudio (iniciado após o primeiro clique do usuário)
let audioCtx = null;

// Variáveis de Rede / Multiplayer
let netMode = 'offline';      // 'offline', 'host' ou 'client'
let myPlayerIdx = 0;          // Sua posição na mesa (Host é sempre 0)
let myPeer = null;            // Objeto PeerJS
let myConnToHost = null;      // Conexão do Cliente com o Host
let connectedClients = [];    // Lista de conexões que o Host mantém
let client_predicted = false; // Controle de latência para jogadas locais

// Reconexão
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000; // 3s entre tentativas
let reconnectTimer = null;
let lastRoomCode = null;     // Guarda o código da sala para reconectar
let lastPlayerIdx = null;    // Guarda o índice do jogador para restaurar
let isReconnecting = false;

window.visualPass = [false, false, false, false];

