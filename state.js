/* ═══════════════════════════════════════════════════════
   ESTADO GLOBAL E CONFIGURAÇÕES (state.js)
═══════════════════════════════════════════════════════ */

let STATE = {
  hands: [],                // Peças na mão de cada jogador
  extremes: [null, null],   // Valores nas duas pontas do jogo
  current: 0,               // Índice do jogador da vez (0-3)
  scores: [0, 0],           // Placar [Equipe A, Equipe B]
  pendingIdx: null,         // Índice da peça aguardando escolha de lado
  isBlocked: false,         // Trava de interação para o jogador
  isOver: false,            // Indica se a rodada atual acabou
  isShuffling: false,       // Trava para evitar múltiplos embaralhamentos simultâneos
  roundWinner: null,        // Quem venceu a última rodada
  lastPlayed: null,         // Último jogador a colocar uma peça no tabuleiro
  positions: [],            // Coordenadas de cada peça no tabuleiro
  passCount: 0,             // Contador de passes seguidos (4 = trancado)
  playerPassed: [false, false, false, false],
  ends: [],                 // Dados técnicos das pontas (direção, contagem de linha)
  playerMemory: [[], [], [], []], // Peças que os oponentes sabem que você NÃO tem
  handSize: [7, 7, 7, 7],   // Quantidade de peças visual nas mãos
  targetScore: 1,           // Meta de vitórias para ganhar o jogo
  difficulty: 'normal',     // Nível de inteligência dos bots
  autoNextInterval: null    // Timer para iniciar a próxima rodada automaticamente
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

// Globais de Interface e Câmera
window.visualPass = [false, false, false, false]; // Controla o "X" vermelho
window.minScaleReached = 1.2;    // Menor zoom alcançado (ajuste automático)
window.currentSnakeScale = 1.2;  // Zoom atual da mesa
window.currentSnakeCx = 0;       // Centro X da mesa
window.currentSnakeCy = 0;       // Centro Y da mesa
