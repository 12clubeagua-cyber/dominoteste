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
    window.mobileLog("Procurando sala...", "yellow");

    try {
        if (window.myPeer) window.myPeer.destroy();
        window.myPeer = new Peer();

        window.myPeer.on('open', () => {
            // reliable: true garante que os pacotes de peças não se percam pelo caminho
            const conn = window.myPeer.connect('domino-' + input, { reliable: true });
            window.setupClientEvents(conn);
        });

        window.myPeer.on('error', (err) => {
            window.mobileLog("Sala não encontrada ou erro: " + err.type, "red");
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
        window.mobileLog("Um jogador saiu da sala", "var(--red)");
        if (window.connectedClients) {
            window.connectedClients = window.connectedClients.filter(c => c !== conn);
        }
        
        // Libera a cadeira caso ele estivesse sentado
        if (conn.assignedIdx !== undefined && typeof window.SeatManager !== 'undefined') {
            window.SeatManager.renderSelectionUI();
        }
        window.broadcastState();
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
            if (typeof window.SeatManager !== 'undefined') window.SeatManager.renderSelectionUI();
            window.broadcastState();
        }
    });
};

window.setupClientEvents = function(conn) {
    conn.on('open', () => {
        window.mobileLog("Conectado ao Host!", "#00ff00");
        window.myConnToHost = conn;
    });

    // Detectar quando o Host fecha a sala ou cai a internet dele
    conn.on('close', () => {
        alert("A conexão com o Host foi perdida.");
        window.location.reload(); 
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
            // Atualiza o estado local com segurança
            Object.assign(window.STATE, data.state);
            
            if (typeof window.renderHands === 'function') window.renderHands();
            if (typeof window.renderBoardFromState === 'function') window.renderBoardFromState();
        }
        
        if (data.type === 'status') {
            if (typeof window.updateStatusLocal === 'function') {
                window.updateStatusLocal(data.text, data.cls);
            }
        }
    });
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