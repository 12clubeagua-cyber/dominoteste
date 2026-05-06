/* 
   ========================================================================
   STATE.JS - O CEREBRO DO DOMINO (VERSAO BLINDADA)
   Centraliza todas as variaveis de estado, rede e memoria da IA.
   Tudo e exportado explicitamente para 'window' para evitar ReferenceErrors.
   ======================================================================== 
*/

window.STATE = {
    // --- Logica de Pecas e Mesa ---
    hands: [[], [], [], []],      // Pecas fisicas nas maos
    handSize: [7, 7, 7, 7],       // Contagem (essencial para sincronizar Clientes)
    extremes: [null, null],       // Numeros das duas pontas da mesa
    ends: [],                     // Dados vetoriais para o animations.js (curvas)
    positions: [],                // Historico de coordenadas das pecas jogadas
    
    // --- Controle de Turno e Fluxo ---
    current: 0,                   // Indice do jogador da vez (0 a 3)
    pendingIdx: null,             // Armazena peca clicada aguardando escolha de lado
    lastPlayed: null,             // Quem fez a ultima jogada (util para empates)
    passCount: 0,                 // Quantos jogadores passaram em sequencia
    playerPassed: [false, false, false, false], 
    isBlocked: false,             // Trava interacoes durante animacoes
    isShuffling: false,           // Estado de embaralhamento inicial
    sessions: {},                 // Mapeamento: seatIdx -> peerId (para reconexao)
    
    // --- Regras e Metas ---
    scores: [0, 0],               // Placar: [Time A+C, Time B+D]
    targetScore: 10,              // Pontuacao para vencer a partida
    difficulty: 'normal',         // 'easy', 'normal' ou 'hard'
    botPersonalities: ['normal', 'aggressive', 'defensive', 'random'], 
    
    // --- Status Finalizadores ---
    isOver: false,                // Rodada terminou?
    matchOver: false,             // Partida inteira terminou?
    roundWinner: null,            // Quem venceu a ultima rodada
    
    // --- Memoria da IA (Essencial para o bots.js) ---
    playerMemory: [[], [], [], []], // O que cada jogador NAO tem
    
    // --- Controle de Tempo ---
    turnTimer: null,              
    autoNextInterval: null        
};

// --- Audio e Sistema ---
window.audioCtx = null;

// --- Variaveis de Rede / Multiplayer ---
window.netMode = 'offline';       // 'offline', 'host' ou 'client'
window.myPlayerIdx = 0;           // Sua posicao na mesa (definida no Seat Selection)
window.myPeer = null;             // Instancia do PeerJS
window.myConnToHost = null;       // Conexao do Cliente com o Host
window.connectedClients = [];     // Lista de conexoes no celular do Host
window.client_predicted = false;  // Otimizacao de interface para o cliente

// --- Sistema de Reconexao (Resiliencia Mobile) ---
window.reconnectAttempts = 0;
window.MAX_RECONNECT_ATTEMPTS = 5;
window.RECONNECT_DELAY_MS = 3000;
window.reconnectTimer = null;
window.lastRoomCode = null;       // Codigo da sala para tentar voltar
window.isReconnecting = false;

// --- Interface Global ---
window.visualPass = [false, false, false, false];

/* 
   ========================================================================
   FUNCOES DE GERENCIAMENTO DE ESTADO
   ======================================================================== 
*/

/**
 * Limpa o timer de turno para evitar que um bot jogue 
 * no momento em que o jogo foi pausado ou reiniciado.
 */
window.clearTurnTimer = function() {
    if (window.STATE.turnTimer) {
        clearTimeout(window.STATE.turnTimer);
        window.STATE.turnTimer = null;
    }
};

/**
 * Reseta os dados taticos para uma nova rodada.
 * Crucial para o funcionamento do bots.js.
 */
window.resetIAAndMemory = function() {
    window.STATE.playerMemory = [[], [], [], []];
    window.STATE.playerPassed = [false, false, false, false];
    window.STATE.passCount = 0;
};

/**
 * Reseta o sistema de reconexao.
 */
window.resetReconnect = function() {
    window.reconnectAttempts = 0;
    window.isReconnecting = false;
    if (window.reconnectTimer) clearTimeout(window.reconnectTimer);
};

// Inicializacao de seguranca: garante que os arrays existam no carregamento
(function init() {
    window.resetIAAndMemory();
    console.log("State.js: Sistema inicializado e exportado globalmente.");
})();