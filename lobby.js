/* 
   ========================================================================
   LOBBY.JS - GERENCIAMENTO DE MENUS E PREPARACAO (VERSAO BLINDADA)
   Controla a navegacao, selecao de dificuldades e o inicio da partida.
   ======================================================================== 
*/

/**
 * 1. NAVEGACAO ENTRE TELAS
 */

window.hideAllSteps = function() {
    document.querySelectorAll('.start-step').forEach(el => el.classList.remove('active'));
};

window.goToStep = function(stepId) {
    window.hideAllSteps();
    const el = document.getElementById(stepId);
    if (el) el.classList.add('active');
};

/**
 * 2. CONFIGURACOES E IDENTIDADE
 */

// Integracao com o modulo Identity protegida
window.changeName = function() {
    if (typeof window.Identity !== 'undefined' && typeof window.Identity.promptChange === 'function') {
        window.Identity.promptChange();
    } else {
        // Fallback robusto caso o modulo nao esteja carregado
        const n = prompt("Nome:");
        if (n && typeof window.NameManager !== 'undefined') {
            window.NameManager.set(0, n);
        }
    }
};

window.selectMode = function(mode) {
    const VALID_MODES = ['offline', 'host', 'client'];
    if (!VALID_MODES.includes(mode)) mode = 'offline';
    
    window.netMode = mode; 
    
    if (mode === 'offline' || mode === 'host') {
        window.goToStep('step-diff');
    } else if (mode === 'client') {
        window.goToStep('step-lobby-client');
    }
};

window.selectDiff = function(diff) {
    if (window.STATE) window.STATE.difficulty = diff;
    
    const ids = ['btn-easy', 'btn-normal', 'btn-hard'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('selected');
    });
    
    const activeEl = document.getElementById(`btn-${diff}`);
    if (activeEl) activeEl.classList.add('selected');
    
    window.goToStep('step-goal');
};

window.selectGoal = function(limit) {
    if (window.STATE) {
        window.STATE.targetScore = (typeof limit === 'number' && limit > 0) ? limit : 3;
    }
    
    if (window.netMode === 'offline') {
        window.startMatch();
    } else if (window.netMode === 'host') {
        window.goToStep('step-lobby-host');
        if (typeof window.initializeHost === 'function') window.initializeHost();
    }
};

/**
 * Carrega uma partida salva do localStorage.
 */
window.loadMatchState = function() {
    try {
        const saved = localStorage.getItem('domino_match_state');
        if (!saved) return;

        const data = JSON.parse(saved);
        if (window.STATE) {
            window.STATE.scores = data.scores || [0, 0];
            window.STATE.targetScore = data.targetScore || 10;
            window.STATE.difficulty = data.difficulty || 'normal';
            window.STATE.matchHistory = data.matchHistory || [];
        }

        // Renderiza o historico salvo
        if (typeof window.FlowUI !== 'undefined' && typeof window.FlowUI.renderHistory === 'function') {
            window.FlowUI.renderHistory();
        }

        window.startMatch(true); // Indica que estamos retomando
    } catch (e) {
        console.warn("Erro ao carregar partida:", e);
        localStorage.removeItem('domino_match_state');
    }
};

// Verifica se existe partida salva ao carregar a pagina
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('domino_match_state');
    const btn = document.getElementById('btn-continue');
    if (saved && btn) {
        btn.style.display = 'flex';
    }
});

/**
 * 3. FLUXO DE INICIO DE JOGO
 */

window.startMatch = function(isResuming = false) {
    // Inicializacao de audio
    if (typeof window.safeAudioInit === 'function') window.safeAudioInit();
    
    if (window.STATE && !isResuming) {
        window.STATE.scores = [0, 0];
        window.STATE.roundWinner = null;
        window.STATE.matchHistory = [];
    }

    if (window.STATE) {
        window.STATE.isOver = false;
    }

    // Atualiza o Dashboard com os nomes e pontos atuais antes de entrar na mesa
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.updateScore === 'function') {
        window.Dashboard.updateScore();
    }
    
    // Transicao visual: Esconde o Lobby e mostra o botao Sair
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';

    const exitBtn = document.getElementById('btn-exit');
    if (exitBtn) exitBtn.style.display = 'block';

    const doStartRound = () => {
        if (typeof window.startRound === 'function') {
            window.startRound();
        } else {
            console.error('Lobby: startRound nao definido ou nao carregado.');
        }
    };

    // --- Logica de Rede (Host) ---
    if (window.netMode === 'host') {
        if (typeof window.Network !== 'undefined' && window.Network.isHost()) {
            
            // Reune os nomes para enviar aos clientes
            let finalNames = {};
            if (typeof window.NameManager !== 'undefined') {
                finalNames = window.NameManager.getAll();
            }
            
            // Envia comando game_start para todos
            window.Network.sync({ 
                type: 'game_start', 
                names: finalNames,
                targetScore: window.STATE ? window.STATE.targetScore : 3
            });

            // O Host roda a funcao de inicio apos um breve delay
            setTimeout(doStartRound, 600);
        }
        
    // --- Logica Local (Offline) ---
    } else if (window.netMode === 'offline') {
        doStartRound();
    }
    
    // NOTA: Se netMode === 'client', ele nao roda o `doStartRound`. Ele apenas 
    // esconde a tela inicial e aguarda o Host enviar o pacote `state_update` com as pecas!
};

/**
 * 4. CANCELAMENTO
 */

window.cancelHosting = function() {
    if (typeof window.myPeer !== 'undefined' && window.myPeer) {
        window.myPeer.destroy();
        window.myPeer = null;
    }
    window.connectedClients = [];
    window.netMode = 'offline';
    window.goToStep('step-mode');
};