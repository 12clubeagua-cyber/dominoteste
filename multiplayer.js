/* 
   ========================================================================
   MULTIPLAYER.JS - VERSÃO ULTRA RESILIENTE E BLINDADA (PEERJS)
   Gerencia conexões P2P, criação de salas e sincronização de rede.
   ======================================================================== 
*/

// 1. RESILIÊNCIA E DEBUG MOBILE
window.mobileLog = function(msg, cor = "white") {
    const statusEl = document.getElementById('host-status');
    const clientStatusEl = document.getElementById('client-status');
    
    if (statusEl && window.netMode === 'host') {
        statusEl.style.color = cor;
        statusEl.innerText = "> " + msg;
    } else if (clientStatusEl && window.netMode === 'client') {
        clientStatusEl.style.color = cor;
        clientStatusEl.innerText = "> " + msg;
    }
};

window.onerror = function(msg, url, line) {
    if (msg.includes("Script error") || msg.includes("PeerJS")) return false;
    // Evita popups excessivos em produção, útil apenas para debug
    console.error("ERRO NO JS: " + msg + "\nLinha: " + line);
    return false;
};

/**
 * 2. UTILITÁRIOS DE REDE
 */
window.generateShortID = function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'domino-' + result;
};

/**
 * 3. LÓGICA DO HOST (CRIADOR DA SALA)
 */
window.initializeHost = function() {
    window.netMode = 'host';
    window.mobileLog("Iniciando Host...", "yellow");
    
    if (typeof Peer === 'undefined') {
        alert("Erro: Biblioteca de rede (PeerJS) não carregou. Verifique sua internet.");
        return;
    }

    try {
        // Limpa conexão anterior se existir
        if (window.myPeer) { 
            window.myPeer.destroy(); 
            window.myPeer = null; 
        }

        const fullID = window.generateShortID();
        window.lastRoomCode = fullID.split('-')[1];

        const codeDisplay = document.getElementById('host-code-display');
        if (codeDisplay) {
            codeDisplay.innerText = window.lastRoomCode;
            codeDisplay.style.color = "var(--gold)";
        }

        window.myPeer = new Peer(fullID);

        window.myPeer.on('open', () => {
            window.mobileLog("SALA ONLINE!", "#00ff00");
            const btnStart = document.getElementById('btn-start-multi');
            if (btnStart) btnStart.style.display = 'flex';
        });

        window.myPeer.on('connection', (conn) => {
            window.mobileLog("Novo jogador conectando...", "yellow");
            window.setupHostEvents(conn);
        });

        window.myPeer.on('error', (err) => {
            window.mobileLog("Erro de rede: " + err.type, "red");
        });

    } catch (e) { 
        alert("Erro fatal no Host: " + e.message); 
    }
};

/**
 * 4. LÓGICA DO CLIENTE (QUEM ENTRA)
 */
window.connectToHost = function() {
    const inputEl = document.getElementById('join-code-input');
    if (!inputEl) return;
    
    const input = inputEl.value.toUpperCase().trim();
    if (!input) return alert("Digite o código da sala!");

    window.netMode = 'client';
    window.lastRoomCode = input; // SALVA O CÓDIGO PARA RECONEXÃO
    window.mobileLog("Procurando sala...", "yellow");

    window._initiateConnection(input);
};

// Separamos a criação da conexão para reutilizar no loop de reconexão
window._initiateConnection = function(roomCode) {
    try {
        if (window.myPeer) window.myPeer.destroy();
        window.myPeer = new Peer();

        window.myPeer.on('open', () => {
            // reliable: true garante que os pacotes de peças não se percam pelo caminho
            const conn = window.myPeer.connect('domino-' + roomCode, { reliable: true });
            window.setupClientEvents(conn);
        });

        window.myPeer.on('error', (err) => {
            window.mobileLog("Erro de rede: " + err.type, "red");
        });
    } catch (e) { 
        alert("Erro ao conectar: " + e.message); 
    }
};

/**
 * 5. TRATAMENTO DE EVENTOS E MENSAGENS
 */
window.setupHostEvents = function(conn) {
    conn.on('open', () => {
        window.mobileLog("Jogador conectado!", "#00ff00");
        if (!window.connectedClients) window.connectedClients = [];
        
        if (!window.connectedClients.includes(conn)) {
            window.connectedClients.push(conn);
        }
        window.broadcastState(); 
    });

    // BLINDAGEM: Remoção de fantasmas
    conn.on('close', () => {
        const gameStarted = window.STATE && window.STATE.positions && window.STATE.positions.length > 0;

        if (gameStarted) {
            window.mobileLog("Queda detectada. Pausando a mesa.", "var(--red)");
            conn.isActive = false; // Marca como offline, mas mantém a cadeira
            window.STATE.isBlocked = true; // Pausa o motor do jogo
            
            const pName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(conn.assignedIdx) : `Jogador ${conn.assignedIdx}`;
            if (typeof window.Network !== 'undefined') {
                window.Network.sendStatus(`Aguardando ${pName}...`, 'pass');
            }

            // BOT TAKEOVER: Timer de segurança de 60 segundos
            conn.botTimer = setTimeout(() => {
                if (!conn.isActive) {
                    window.mobileLog("Tempo esgotado. Bot assumindo...", "var(--gold)");
                    // Converte a cadeira para Bot
                    if (typeof window.BotManager !== 'undefined') {
                        window.BotManager.activateForSeat(conn.assignedIdx);
                    }
                    window.STATE.isBlocked = false; // Despausa o motor
                    window.broadcastState();
                }
            }, 60000); 
        } else {
            // Comportamento original do Lobby (Libera a cadeira)
            window.mobileLog("Um jogador saiu do lobby", "var(--red)");
            if (window.connectedClients) {
                window.connectedClients = window.connectedClients.filter(c => c !== conn);
            }
            if (conn.assignedIdx !== undefined && typeof window.SeatManager !== 'undefined') {
                window.SeatManager.renderSelectionUI();
            }
            window.broadcastState();
        }
    });

    conn.on('data', (data) => {
        if (!data) return;
        
        if (data.type === 'play_request') {
            if (typeof window.play === 'function') {
                window.play(conn.assignedIdx, data.tIdx, data.side);
            }
        }
        if (data.type === 'request_seat') {
            conn.assignedIdx = data.seatIdx;
            if (typeof window.SeatManager !== 'undefined') {
                conn.isActive = true;
                window.SeatManager.renderSelectionUI();
            }
            window.broadcastState();
        }

        // NOVO: Handshake de Restauração
        if (data.type === 'reconnect_request') {
            const targetIdx = data.seatIdx;
            const oldConnIndex = window.connectedClients.findIndex(c => c.assignedIdx === targetIdx);
            
            if (oldConnIndex !== -1) {
                // Atualiza o socket da cadeira com a nova conexão
                conn.assignedIdx = targetIdx;
                conn.isActive = true;
                window.connectedClients[oldConnIndex] = conn;

                window.mobileLog("Jogador restaurado!", "#00ff00");
                window.STATE.isBlocked = false; // Despausa o motor
                
                const pName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(targetIdx) : 'Jogador';
                if (typeof window.Network !== 'undefined') {
                    window.Network.sendStatus(`${pName} VOLTOU!`, 'active');
                }

                // Envia o estado completo + a mão privada desse jogador específico
                conn.send({
                    type: 'recovery_state',
                    state: window.STATE,
                    myHand: window.STATE.hands[targetIdx]
                });

                window.broadcastState();
            }
        }
    });
};

window.setupClientEvents = function(conn) {
    conn.on('open', () => {
        window.mobileLog("Conectado ao Host!", "#00ff00");
        window.myConnToHost = conn;
        
        // Se for uma reconexão bem-sucedida, dispara o handshake
        if (window.isReconnecting) {
            conn.send({ type: 'reconnect_request', seatIdx: window.myPlayerIdx });
        }
    });

    // Detectar quando o Host fecha a sala ou cai a internet dele
    conn.on('close', () => {
        // Se a partida já começou, não recarrega a página. Inicia o resgate.
        if (window.STATE && window.STATE.positions && window.STATE.positions.length > 0) {
            window.attemptReconnect();
        } else {
            alert("A conexão com o Host foi perdida no lobby.");
            window.location.reload(); 
        }
    });

    conn.on('data', (data) => {
        if (!data) return;

        if (data.type === 'game_start') {
            window.myPlayerIdx = data.yourIdx;
            if (data.names && typeof window.NameManager !== 'undefined') {
                window.NameManager.updateAll(data.names);
            }
            if (typeof window.startMatch === 'function') window.startMatch();
        }
        
        if (data.type === 'state_update' && window.STATE) {
            Object.assign(window.STATE, data.state);
            if (typeof window.renderHands === 'function') window.renderHands();
            if (typeof window.renderBoardFromState === 'function') window.renderBoardFromState();
        }

        // NOVO: Pacote de recuperação de estado privado
        if (data.type === 'recovery_state') {
            Object.assign(window.STATE, data.state);
            window.STATE.hands[window.myPlayerIdx] = data.myHand; // Restaura a mão oculta
            
            // Limpa UI de reconexão
            window.isReconnecting = false;
            clearInterval(window.reconnectTimer);
            document.getElementById('reconnect-overlay').style.display = 'none';
            
            // Redesenha e verifica se é o turno do jogador
            if (typeof window.renderHands === 'function') window.renderHands(true);
            if (typeof window.renderBoardFromState === 'function') window.renderBoardFromState();
            
            if (window.STATE.current === window.myPlayerIdx && !window.STATE.isBlocked) {
                if (typeof window.getMoves === 'function') {
                    const moves = window.getMoves(window.STATE.hands[window.myPlayerIdx]);
                    if (moves.length > 0 && typeof window.highlight === 'function') window.highlight(moves);
                }
            }
        }
        
        if (data.type === 'status') {
            if (typeof window.updateStatusLocal === 'function') {
                window.updateStatusLocal(data.text, data.cls);
            }
        }
    });
};

// A Máquina de Reconexão
window.attemptReconnect = function() {
    if (window.isReconnecting) return;
    window.isReconnecting = true;
    window.reconnectAttempts = 0;

    const overlay = document.getElementById('reconnect-overlay');
    const msgEl = document.getElementById('reconnect-msg');
    if (overlay) overlay.style.display = 'flex';

    window.reconnectTimer = setInterval(() => {
        window.reconnectAttempts++;
        if (msgEl) msgEl.innerText = `Tentando reconectar... (${window.reconnectAttempts}/${window.MAX_RECONNECT_ATTEMPTS})`;

        if (window.reconnectAttempts > window.MAX_RECONNECT_ATTEMPTS) {
            clearInterval(window.reconnectTimer);
            alert("Sinal perdido. Retornando ao menu.");
            window.location.reload();
            return;
        }

        window._initiateConnection(window.lastRoomCode);
    }, window.RECONNECT_DELAY_MS || 3000);
};

window.cancelReconnect = function() {
    if (window.reconnectTimer) clearInterval(window.reconnectTimer);
    window.location.reload();
};

/**
 * 6. SISTEMA DE TRANSMISSÃO (BROADCAST)
 */
window.broadcastToClients = function(data) {
    if (window.netMode !== 'host' || !Array.isArray(window.connectedClients)) return;

    window.connectedClients.forEach(conn => {
        if (conn && conn.open) {
            try { 
                conn.send(data); 
            } catch (e) { 
                console.warn("Falha no envio P2P:", e); 
            }
        }
    });
};

window.broadcastState = function() {
    if (window.netMode !== 'host' || !window.STATE) return;

    // Criamos um pacote apenas com os dados públicos. 
    // NOTA: As 'hands' (mãos) não vão inteiras para evitar cheats (trapaças) de rede.
    const statePackage = {
        type: 'state_update',
        state: {
            current: window.STATE.current,
            extremes: window.STATE.extremes,
            positions: window.STATE.positions,
            handSize: window.STATE.handSize,
            scores: window.STATE.scores,
            isOver: window.STATE.isOver,
            playerPassed: window.STATE.playerPassed,
            roundWinner: window.STATE.roundWinner
        }
    };
    window.broadcastToClients(statePackage);
};