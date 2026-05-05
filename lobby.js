/* 
   ========================================================================
   LOBBY.JS - GERENCIAMENTO DE MENUS E PREPARAÇÃO (VERSÃO BLINDADA)
   Controla a navegação, seleção de dificuldades e o início da partida.
   ======================================================================== 
*/

/**
 * 1. NAVEGAÇÃO ENTRE TELAS
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
 * 2. CONFIGURAÇÕES E IDENTIDADE
 */

// Integração com o módulo Identity protegida
window.changeName = function() {
    if (typeof window.Identity !== 'undefined' && typeof window.Identity.promptChange === 'function') {
        window.Identity.promptChange();
    } else {
        // Fallback robusto caso o módulo não esteja carregado
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
 * 3. FLUXO DE INÍCIO DE JOGO
 */

window.startMatch = function() {
    // Inicialização de áudio
    if (typeof window.safeAudioInit === 'function') window.safeAudioInit();
    
    if (window.STATE) {
        window.STATE.scores = [0, 0];
        window.STATE.roundWinner = null;
        window.STATE.isOver = false;
    }

    // Atualiza o Dashboard com os nomes e pontos zerados antes de entrar na mesa
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.updateScore === 'function') {
        window.Dashboard.updateScore();
    }
    
    // Transição visual: Esconde o Lobby e mostra o botão Sair
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';

    const exitBtn = document.getElementById('btn-exit');
    if (exitBtn) exitBtn.style.display = 'block';

    const doStartRound = () => {
        if (typeof window.startRound === 'function') {
            window.startRound();
        } else {
            console.error('Lobby: startRound não definido ou não carregado.');
        }
    };

    // --- Lógica de Rede (Host) ---
    if (window.netMode === 'host') {
        if (typeof window.Network !== 'undefined' && window.Network.isHost()) {
            
            // Reúne os nomes para enviar aos clientes
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

            // O Host roda a função de início após um breve delay
            setTimeout(doStartRound, 600);
        }
        
    // --- Lógica Local (Offline) ---
    } else if (window.netMode === 'offline') {
        doStartRound();
    }
    
    // NOTA: Se netMode === 'client', ele não roda o `doStartRound`. Ele apenas 
    // esconde a tela inicial e aguarda o Host enviar o pacote `state_update` com as peças!
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