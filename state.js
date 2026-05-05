/* 
   ========================================================================
   STATE.JS - O CÉREBRO DO DOMINÓ (VERSÃO BLINDADA)
   Centraliza todas as variáveis de estado, rede e memória da IA.
   Tudo é exportado explicitamente para 'window' para evitar ReferenceErrors.
   ======================================================================== 
*/

window.STATE = {
    // --- Lógica de Peças e Mesa ---
    hands: [[], [], [], []],      // Peças físicas nas mãos
    handSize: [7, 7, 7, 7],       // Contagem (essencial para sincronizar Clientes)
    extremes: [null, null],       // Números das duas pontas da mesa
    ends: [],                     // Dados vetoriais para o animations.js (curvas)
    positions: [],                // Histórico de coordenadas das peças jogadas
    
    // --- Controle de Turno e Fluxo ---
    current: 0,                   // Índice do jogador da vez (0 a 3)
    pendingIdx: null,             // Armazena peça clicada aguardando escolha de lado
    lastPlayed: null,             // Quem fez a última jogada (útil para empates)
    passCount: 0,                 // Quantos jogadores passaram em sequência
    playerPassed: [false, false, false, false], 
    isBlocked: false,             // Trava interações durante animações
    isShuffling: false,           // Estado de embaralhamento inicial
    
    // --- Regras e Metas ---
    scores: [0, 0],               // Placar: [Time A+C, Time B+D]
    targetScore: 10,              // Pontuação para vencer a partida
    difficulty: 'normal',         // 'easy', 'normal' ou 'hard'
    matchHistory: [],             // Registro de rodadas (vencedor, pontos, msg)
    botPersonalities: ['normal', 'aggressive', 'defensive', 'random'], 
    
    // --- Status Finalizadores ---
    isOver: false,                // Rodada terminou?
    matchOver: false,             // Partida inteira terminou?
    roundWinner: null,            // Quem venceu a última rodada
    
    // --- Memória da IA (Essencial para o bots.js) ---
    playerMemory: [[], [], [], []], // O que cada jogador NÃO tem
    
    // --- Controle de Tempo ---
    turnTimer: null,              
    autoNextInterval: null        
};

// --- Áudio e Sistema ---
window.audioCtx = null;

// --- Variáveis de Rede / Multiplayer ---
window.netMode = 'offline';       // 'offline', 'host' ou 'client'
window.myPlayerIdx = 0;           // Sua posição na mesa (definida no Seat Selection)
window.myPeer = null;             // Instância do PeerJS
window.myConnToHost = null;       // Conexão do Cliente com o Host
window.connectedClients = [];     // Lista de conexões no celular do Host
window.client_predicted = false;  // Otimização de interface para o cliente

// --- Sistema de Reconexão (Resiliência Mobile) ---
window.reconnectAttempts = 0;
window.MAX_RECONNECT_ATTEMPTS = 5;
window.RECONNECT_DELAY_MS = 3000;
window.reconnectTimer = null;
window.lastRoomCode = null;       // Código da sala para tentar voltar
window.isReconnecting = false;

// --- Interface Global ---
window.visualPass = [false, false, false, false];

/* 
   ========================================================================
   FUNÇÕES DE GERENCIAMENTO DE ESTADO
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
 * Reseta os dados táticos para uma nova rodada.
 * Crucial para o funcionamento do bots.js.
 */
window.resetIAAndMemory = function() {
    window.STATE.playerMemory = [[], [], [], []];
    window.STATE.playerPassed = [false, false, false, false];
    window.STATE.passCount = 0;
};

/**
 * Reseta o sistema de reconexão.
 */
window.resetReconnect = function() {
    window.reconnectAttempts = 0;
    window.isReconnecting = false;
    if (window.reconnectTimer) clearTimeout(window.reconnectTimer);
};

// Inicialização de segurança: garante que os arrays existam no carregamento
(function init() {
    window.resetIAAndMemory();
    console.log("State.js: Sistema inicializado e exportado globalmente.");
})();