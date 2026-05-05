/* 
   ========================================================================
   GAME.JS - O MOTOR DO JOGO (VERSÃO INTEGRADA E SEGURA)
   Gerencia o ciclo de vida da rodada, turnos e ações.
   ======================================================================== 
*/

let turnRetryCount = 0;
const MAX_TURN_RETRIES = 10;

/**
 * 1. CICLO DE VIDA DA RODADA
 */

window.startRound = function() {
    // Acessando STATE globalmente para maior segurança
    window.STATE.isOver = false;
    window.STATE.isBlocked = true;
    window.STATE.isShuffling = true;
    window.STATE.playerMemory = [[], [], [], []];
    window.STATE.playerPassed = [false, false, false, false];
    window.STATE.passCount = 0;
    window.STATE.lastPlayed = null;

    // Limpeza de UI via Dashboard e FlowUI com verificação de segurança
    if (typeof window.FlowUI !== 'undefined' && typeof window.FlowUI.resetForNewRound === 'function') {
        window.FlowUI.resetForNewRound();
    }
    
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.setMessage === 'function') {
        window.Dashboard.setMessage("EMBARALHANDO...");
    }

    // Sincroniza início do embaralhamento no Multiplayer
    if (typeof window.Network !== 'undefined' && typeof window.Network.sync === 'function') {
        window.Network.sync({ type: 'shuffle_start' });
    }

    // Inicia animacao visual antes de distribuir as pecas
    if (typeof runShuffleAnimation === 'function') {
        if (typeof window.playShuffleSound === 'function') window.playShuffleSound();
        runShuffleAnimation(() => window.dealAndStart());
    } else {
        // Fallback caso animations.js falhe
        window.dealAndStart(); 
    }
};

window.dealAndStart = function() {
    const s = document.getElementById('snake');
    if (s) s.innerHTML = '';

    // MÓDULO DEALER: Logística de geração e distribuição
    if (typeof window.Dealer !== 'undefined') {
        const deck = window.Dealer.generateDeck();
        window.Dealer.shuffle(deck);
        window.STATE.hands = window.Dealer.distribute(deck);
    } else {
        console.error("Dealer.js não carregado.");
        return;
    }
    
    window.STATE.handSize = [7, 7, 7, 7];
    window.STATE.positions = [];
    window.STATE.extremes = [null, null];

    // Configuração inicial para o sistema de geometria de posicionamento
    window.STATE.ends = [
        { hscX: 0, hscY: 0, dir: 270, lineCount: 1, lastVDir: 270, wasDouble: false },
        { hscX: 0, hscY: 0, dir: 90,  lineCount: 1, lastVDir: 90,  wasDouble: false },
    ];

    // MÓDULO REFEREE: Define quem começa
    if (typeof window.Referee !== 'undefined') {
        window.STATE.current = window.Referee.getInitialPlayer(window.STATE.hands, window.STATE.roundWinner);
    } else {
        window.STATE.current = 0; // Fallback
    }

    window.STATE.isOver = false;
    window.STATE.isBlocked = false;
    window.STATE.isShuffling = false;

    // Sincronização e Renderização Inicial Segura
    if (typeof window.Network !== 'undefined') window.Network.syncState();
    
    if (typeof window.Renderer !== 'undefined') {
        if (typeof window.Renderer.drawHands === 'function') window.Renderer.drawHands();
        if (typeof window.Renderer.drawBoard === 'function') window.Renderer.drawBoard(); 
    }

    if (typeof window.Dashboard !== 'undefined') {
        window.Dashboard.updateScore();
    }
    
    const startDelay = (window.CONFIG && window.CONFIG.GAME && window.CONFIG.GAME.START_DELAY) ? window.CONFIG.GAME.START_DELAY : 1200;
    setTimeout(() => window.processTurn(), startDelay);
};

/**
 * 2. GESTÃO DE TURNOS
 */

window.processTurn = function() {
    if (window.STATE.isOver) return;
    window.STATE.isBlocked = false;
    const cur = window.STATE.current;

    // Fallback para evitar travamentos em caso de dessincronização
    if (!window.STATE.hands[cur]) {
        turnRetryCount++;
        if (turnRetryCount < MAX_TURN_RETRIES) {
            setTimeout(window.processTurn, 500);
            return;
        }
        window.STATE.hands[cur] = [];
    }
    turnRetryCount = 0;

    let moves = [];
    if (typeof getMoves === 'function') {
        moves = getMoves(window.STATE.hands[cur]);
    }

    const netMode = window.netMode || 'offline';
    const myIdx = window.myPlayerIdx || 0;
    
    // Determina se o turno pertence ao jogador local
    let isLocal = false;
    if (netMode === 'offline') {
        isLocal = (cur === myIdx);
    } else if (netMode === 'host') {
        isLocal = (cur === myIdx || (window.connectedClients && window.connectedClients.some(c => c.assignedIdx === cur)));
    } else {
        isLocal = (cur === myIdx);
    }

    // --- LOGICA DO BOT ---
    if (!isLocal && netMode !== 'client') {
        window.STATE.isBlocked = true;
        
        const botName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(cur) : `Bot ${cur}`;
        if (typeof window.Dashboard !== 'undefined') {
            window.Dashboard.setMessage(`${botName} PENSANDO...`);
        }

        // Balao de pensamento visual
        const localIdx = window.myPlayerIdx ?? 0;
        const viewIdx = (cur - localIdx + 4) % 4;
        const handEl = document.getElementById(`hand-${viewIdx}`);
        if (handEl) {
            const bubble = document.createElement('div');
            bubble.className = 'thinking-bubble';
            bubble.innerText = '...';
            handEl.appendChild(bubble);
            setTimeout(() => bubble.remove(), 1000);
        }

        const minDelay = (window.CONFIG?.BOT?.MIN_DELAY) || 500;
        const delay = minDelay + Math.random() * 1000;
        
        window.STATE.turnTimer = setTimeout(() => {
            if (moves.length === 0) {
                window.doPass(cur);
            } else if (typeof chooseBotMove === 'function') {
                const move = chooseBotMove(cur, moves);
                window.play(cur, move.idx, move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side));
            }
        }, delay);
        return;
    }

    // --- LÓGICA DO JOGADOR SEM PEÇAS VÁLIDAS ---
    if (moves.length === 0) {
        window.STATE.isBlocked = true;
        
        if (typeof window.Dashboard !== 'undefined') {
            const pName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(cur) : `Jogador ${cur}`;
            window.Dashboard.setMessage(`${pName} NÃO TEM PEÇA`, 'pass');
        }
        
        if (netMode !== 'client') {
            const passDelay = (window.CONFIG?.GAME?.PASS_DISPLAY_TIME) || 1000;
            window.STATE.turnTimer = setTimeout(() => window.doPass(cur), passDelay);
        }
        return;
    }

    // --- LÓGICA DO JOGADOR LOCAL COM PEÇAS ---
    if (isLocal) {
        if (netMode === 'client' || (netMode === 'host' && cur === myIdx) || netMode === 'offline') {
            if (typeof window.Dashboard !== 'undefined') window.Dashboard.setMessage('SUA VEZ', 'active');
            if (typeof highlight === 'function') highlight(moves); // Ativa as peças
        } else {
            if (typeof window.Dashboard !== 'undefined') {
                const pName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(cur) : `Jogador ${cur}`;
                window.Dashboard.setMessage(`${pName} JOGANDO...`);
            }
        }
    }
};

/**
 * 3. AÇÕES (JOGAR E PASSAR)
 */

window.play = function(pIdx, tIdx, side) {
    if (window.STATE.isOver) return;
    
    const netMode = window.netMode || 'offline';
    const myIdx = window.myPlayerIdx || 0;

    if (netMode === 'client' && pIdx === myIdx) {
        window.STATE.isBlocked = true;
        if (typeof window.Network !== 'undefined') {
            window.Network.request({ type: 'play_request', tIdx, side });
        }
        return;
    }

    window.STATE.playerPassed.fill(false);
    window.STATE.passCount = 0;
    window.STATE.lastPlayed = pIdx;

    const tile = window.STATE.hands[pIdx].splice(tIdx, 1)[0];
    window.STATE.handSize[pIdx]--;
    
    // Shake se for carroca (bucha)
    if (tile[0] === tile[1] && typeof window.screenShake === 'function') {
        window.screenShake();
    }

    if (typeof window.Renderer !== 'undefined' && typeof window.Renderer.drawHands === 'function') {
        window.Renderer.drawHands(); 
    }

    const normalizedSide = (side === 'any') ? 0 : side;
    
    let placement = null;
    if (typeof calculateTilePlacement === 'function') {
        placement = calculateTilePlacement(tile, normalizedSide);
    }

    if (placement) {
        if (!window.STATE.positions.length) {
            window.STATE.extremes = [tile[0], tile[1]];
        } else {
            window.STATE.extremes[normalizedSide] = placement.vOther;
        }
        window.STATE.positions.push(placement.nP);
    }

    // Chama a câmera globalmente
    if (typeof window.updateCamera === 'function') window.updateCamera();

    if (typeof window.Network !== 'undefined') {
        window.Network.sync({ type: 'animate_play', pIdx, nP: placement ? placement.nP : null, tIdx });
    }

    // Anima a peça voadora
    if (typeof animateTile === 'function' && placement) {
        animateTile(pIdx, placement.nP, () => window._completePlay(pIdx));
    } else {
        window._completePlay(pIdx); // Fallback instantâneo
    }
};

/**
 * Função auxiliar interna para completar a jogada após a animação
 * @private
 */
window._completePlay = function(pIdx) {
    window.STATE.isBlocked = false;
    
    if (typeof window.Renderer !== 'undefined' && typeof window.Renderer.drawBoard === 'function') {
        window.Renderer.drawBoard();
    }
    
    if (window.STATE.hands[pIdx].length === 0) {
        window.endRound('win', pIdx);
    } else {
        window.STATE.current = (window.STATE.current + 1) % 4;
        if (typeof window.Network !== 'undefined') window.Network.syncState();
        window.processTurn();
    }
};

window.doPass = function(pIdx) {
    if (window.STATE.isOver) return;

    if (window.STATE.extremes[0] !== null) {
        [0, 1].forEach(s => {
            if (!window.STATE.playerMemory[pIdx].includes(window.STATE.extremes[s])) {
                window.STATE.playerMemory[pIdx].push(window.STATE.extremes[s]);
            }
        });
    }

    window.STATE.playerPassed[pIdx] = true;
    window.STATE.passCount++;

    if (typeof playPass === 'function') playPass(); 
    
    if (typeof window.Renderer !== 'undefined' && typeof window.Renderer.flashPass === 'function') {
        window.Renderer.flashPass(pIdx); 
    }
    
    if (typeof window.Network !== 'undefined') {
        window.Network.sync({ type: 'animate_pass', pIdx });
    }

    if (window.STATE.passCount >= 4) {
        window.endRound('block', -1);
    } else {
        window.STATE.isBlocked = true;
        const passDelay = (window.CONFIG?.GAME?.PASS_DISPLAY_TIME) || 1000;
        
        setTimeout(() => {
            window.STATE.current = (window.STATE.current + 1) % 4;
            if (typeof window.Network !== 'undefined') window.Network.syncState();
            window.processTurn();
        }, passDelay);
    }
};

/**
 * 4. FINALIZAÇÃO
 */

window.endRound = function(reason, winnerIdx) {
    if (window.STATE.isOver) return;
    window.STATE.isOver = true;
    window.STATE.isBlocked = true;

    let result = { winTeam: -1, msg: '', detail: '' };
    const myIdx = window.myPlayerIdx || 0;

    if (reason === 'win') {
        const team = (winnerIdx % 2 === 0 ? 0 : 1);
        const winnerName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(winnerIdx) : `Jogador ${winnerIdx}`;
        
        result = { 
            winTeam: team, 
            msg: (myIdx % 2 === team ? 'SUA DUPLA VENCEU!' : 'OPONENTES VENCERAM!'),
            detail: `${winnerName} fechou a mão!` 
        };
        window.STATE.roundWinner = winnerIdx;
    } else {
        if (typeof window.Referee !== 'undefined') {
            result = window.Referee.calculateBlockResult(window.STATE.hands);
        }
        result.msg = "JOGO TRANCADO!";
        window.STATE.roundWinner = (result.winTeam !== -1 ? result.winTeam : window.STATE.lastPlayed);
    }

    if (result.winTeam !== -1) window.STATE.scores[result.winTeam]++;

    if (typeof window.Network !== 'undefined') {
        window.Network.sync({ type: 'end_round', ...result, hands: window.STATE.hands });
        window.Network.syncState();
    }

    if (typeof window.FlowUI !== 'undefined' && typeof window.FlowUI.endRound === 'function') {
        window.FlowUI.endRound(result.winTeam, winnerIdx, result.msg, result.detail);
    }
};