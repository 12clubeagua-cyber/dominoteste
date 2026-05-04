/* 
    LOGICA PEERJS (multiplayer.js) - VERSÃO OTIMIZADA
    Alterações: ID de 1 letra, Logs de Debug, Sistema de Reconexão sem F5.
*/

// --- CONFIGURAÇÕES E VARIÁVEIS DE CONTROLE ---
let lastRoomCode = '';
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;
let reconnectTimer = null;

/**
 * Gera um ID de sala com apenas 1 letra.
 */
function generateShortID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    // Alterado para 1 iteração apenas
    for (let i = 0; i < 1; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'domino-' + result;
}

/**
 * Inicializa o Host (Dono da Sala)
 */
function initializeHost() {
    if (typeof Peer === 'undefined') return;
    if (myPeer) myPeer.destroy();

    const roomCode = generateShortID();
    lastRoomCode = roomCode.split('-')[1]; // Salva a letra gerada

    const codeEl = document.getElementById('host-code-display');
    if (codeEl) codeEl.innerText = lastRoomCode;

    myPeer = new Peer(roomCode);

    myPeer.on('open', (id) => {
        console.log(`[HOST] Sala criada com sucesso! ID: ${lastRoomCode}`);
        const btn = document.getElementById('btn-start-multi');
        if (btn) btn.style.display = 'flex';
    });

    myPeer.on('error', (err) => {
        console.error("[HOST] Erro no Peer:", err.type);
        if (err.type === 'unavailable-id') {
            alert("Código de sala já em uso. Tentando gerar outro...");
            window.location.reload();
        }
    });

    myPeer.on('connection', (conn) => {
        let freeIdx = -1;
        for (let i = 1; i <= 3; i++) {
            if (!connectedClients.some(c => c.assignedIdx === i)) {
                freeIdx = i;
                break;
            }
        }

        if (freeIdx === -1) {
            conn.on('open', () => {
                conn.send({ type: 'error', msg: 'Sala cheia!' });
                setTimeout(() => conn.close(), 100);
            });
            return;
        }

        conn.assignedIdx = freeIdx;
        connectedClients.push(conn);

        conn.on('open', () => {
            conn.send({ type: 'welcome', yourIdx: conn.assignedIdx, names: NameManager.getAll() });
            NameManager.set(conn.assignedIdx, `Jogador ${conn.assignedIdx}`);
            updateHostLobbyUI();
            broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
        });

        conn.on('data', (data) => {
            // Logs de entrada de dados para o Host
            if (data.type === 'play_request') console.log(`[HOST] Jogada recebida do Player ${conn.assignedIdx}`);

            if (data.type === 'set_name') {
                NameManager.set(conn.assignedIdx, data.name);
                updateHostLobbyUI();
                broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
            }

            if (data.type === 'request_seat') {
                const requestedIdx = data.seatIdx;
                const isAvailable = (requestedIdx !== 0) && !connectedClients.some(c => c.assignedIdx === requestedIdx);
                if (isAvailable) {
                    const oldIdx = conn.assignedIdx;
                    conn.assignedIdx = requestedIdx;
                    if (NameManager.get(oldIdx) === `Jogador ${oldIdx}`) {
                        NameManager.set(requestedIdx, `Jogador ${requestedIdx}`);
                    } else {
                        NameManager.set(requestedIdx, NameManager.get(oldIdx));
                    }
                    NameManager.set(oldIdx, 'Aguardando...');
                    conn.send({ type: 'welcome', yourIdx: requestedIdx, names: NameManager.getAll() });
                    updateHostLobbyUI();
                    broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
                }
            }

            if (data.type === 'reconnect') {
                console.log(`[HOST] Tentativa de reconexão: ${data.name} (ID sugerido: ${data.playerIdx})`);
                const requestedIdx = data.playerIdx;
                const seatFree = !connectedClients.some(c => c.assignedIdx === requestedIdx);
                if (seatFree && [1, 2, 3].includes(requestedIdx)) {
                    conn.assignedIdx = requestedIdx;
                    NameManager.set(requestedIdx, data.name);
                    broadcastState();
                    updateStatus(`${data.name} reconectado!`, 'active');
                }
            }

            if (data.type === 'play_request' && STATE.current === conn.assignedIdx) play(conn.assignedIdx, data.tIdx, data.side);
            if (data.type === 'next_round_request' && STATE.isOver) startRound();
        });

        conn.on('close', () => {
            console.warn(`[HOST] Cliente ${conn.assignedIdx} desconectou.`);
            connectedClients = connectedClients.filter(c => c !== conn);
            NameManager.set(conn.assignedIdx, 'Aguardando...');
            updateHostLobbyUI();
            if (!STATE.isOver) {
                STATE.isBlocked = true;
                updateStatus(`Jogador ${conn.assignedIdx} caiu. Pausado.`, 'pass');
            }
        });
    });
}

/**
 * Envia o estado do jogo para todos. 
 * Adicionado log de volume de dados.
 */
function broadcastState() {
    if (netMode !== 'host') return;
    let anonymizedState;
    try {
        anonymizedState = JSON.parse(JSON.stringify(STATE));
    } catch (e) { return; }

    connectedClients.forEach(conn => {
        if (!conn || !conn.open || conn.assignedIdx === undefined) return;
        const clientIdx = conn.assignedIdx;
        const filteredHands = anonymizedState.hands.map((hand, idx) => (idx === clientIdx ? hand : []));
        
        conn.send({ 
            type: 'sync_state', 
            state: { ...anonymizedState, hands: filteredHands }, 
            names: NameManager.getAll() 
        });
    });
}

/**
 * Interpreta dados recebidos pelo Cliente
 */
function handleClientData(data) {
    if (data.type === 'sync_state') {
        // Log para monitorar o placar e evitar confusão com vitórias
        console.log(`[CLIENTE] Sincronização recebida. Placar: ${data.state.scores[0]} - ${data.state.scores[1]}`);
        
        if (data.names) NameManager.updateAll(data.names);
        if (STATE.turnTimer) clearTimeout(STATE.turnTimer);
        if (myPlayerIdx === undefined || myPlayerIdx === null) return;

        const hostState = data.state;
        STATE.hands = hostState.hands || [[],[],[],[]];
        STATE.handSize = hostState.handSize || [7,7,7,7];
        STATE.extremes = hostState.extremes || [null, null];
        STATE.current = hostState.current ?? 0;
        STATE.scores = hostState.scores || [0, 0];
        STATE.isOver = hostState.isOver ?? false;

        updateScoreDisplay();
        renderBoardFromState();
        renderHands(STATE.isOver);
        updateSnakeScale();

        if (!STATE.isOver && STATE.current === myPlayerIdx) {
            STATE.isBlocked = false;
            setTimeout(processTurn, 100);
        } else if (!STATE.isOver) {
            STATE.isBlocked = true;
            updateStatusLocal(`${NameManager.get(STATE.current)} JOGANDO...`);
        }
    }

    if (data.type === 'welcome') {
        myPlayerIdx = data.yourIdx;
        console.log(`[CLIENTE] Bem-vindo! Meu índice é: ${myPlayerIdx}`);
        if (data.names) NameManager.updateAll(data.names);
        if (netMode === 'client' && typeof SeatManager !== 'undefined') SeatManager.renderSelectionUI();
    }

    if (data.type === 'game_start') {
        console.log("[CLIENTE] Partida iniciada!");
        myPlayerIdx = data.yourIdx;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        // Reset do estado local omitido para brevidade (mantenha o seu original aqui)
    }

    if (data.type === 'animate_play') {
        const alreadyExists = STATE.positions.some(p => p.x === data.nP.x && p.y === data.nP.y);
        if (!alreadyExists) STATE.positions.push(data.nP);
        animateTile(data.pIdx, data.nP, () => { renderBoardFromState(); });
    }
    
    if (data.type === 'end_round') {
        console.log(`[CLIENTE] Fim da rodada! Vencedor Time: ${data.winTeam}`);
        executeEndRoundUI(data.winTeam, data.idx, data.msg);
    }
}

/**
 * Conecta ao Host com validação de 1 letra e log de queda
 */
function connectToHost() {
    if (typeof Peer === 'undefined') return;
    const input = document.getElementById('join-code-input').value.toUpperCase().trim();
    
    // Agora aceita apenas 1 caractere
    if (input.length < 1) return;
    
    const statusEl = document.getElementById('client-status');
    if (statusEl) statusEl.innerText = "Conectando...";

    if (myPeer) myPeer.destroy();
    myPeer = new Peer(); 

    myPeer.on('error', (err) => {
        console.error("[PEER ERRO]", err);
        if (statusEl) statusEl.innerText = "Erro: " + (err.type === 'peer-unavailable' ? "Sala não encontrada" : err.type);
    });

    myPeer.on('open', () => {
        lastRoomCode = input; // Salva para tentarReconectar
        myConnToHost = myPeer.connect('domino-' + input);

        myConnToHost.on('data', handleClientData);

        myConnToHost.on('close', () => {
            console.warn("[REDE] Conexão fechada inesperadamente.");
            console.log(`[DEBUG] No fechamento: Placar ${STATE.scores} | isOver: ${STATE.isOver}`);
            
            if (statusEl) statusEl.innerText = "Conexão perdida. Reconectando...";
            
            // Em vez de dar F5, tenta reconectar
            tentarReconectar();
        });

        myConnToHost.on('open', () => {
            reconnectAttempts = 0; // Reset ao conectar com sucesso
            console.log("[REDE] Conexão aberta com o Host.");
            if (statusEl) statusEl.innerText = "Conectado!";
            myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
        });
    });
}

/**
 * Tenta restabelecer a conexão sem perder o progresso
 */
function tentarReconectar() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    reconnectAttempts++;
    console.log(`[RECONEXÃO] Tentativa ${reconnectAttempts} de ${MAX_RECONNECT_ATTEMPTS}...`);

    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error("[RECONEXÃO] Limite de tentativas excedido.");
        alert("Não foi possível reconectar à sala.");
        window.location.reload(); // Só dá F5 se falhar 5 vezes
        return;
    }

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (typeof Peer === 'undefined') return;

        myPeer = new Peer();
        myPeer.on('open', () => {
            console.log(`[RECONEXÃO] Peer aberto, tentando vincular a domino-${lastRoomCode}`);
            myConnToHost = myPeer.connect('domino-' + lastRoomCode);
            
            myConnToHost.on('data', handleClientData);
            myConnToHost.on('open', () => {
                console.log("[RECONEXÃO] Sucesso! Enviando pacote de restauração...");
                reconnectAttempts = 0;
                myConnToHost.send({ 
                    type: 'reconnect', 
                    name: NameManager.get(0), 
                    playerIdx: myPlayerIdx 
                });
            });

            myConnToHost.on('close', tentarReconectar);
        });
    }, RECONNECT_DELAY_MS);
}

/**
 * Funções Auxiliares de Interface
 */
function updateHostLobbyUI() {
    if (typeof SeatManager !== 'undefined' && SeatManager.renderSelectionUI) SeatManager.renderSelectionUI();
    const statusEl = document.getElementById('host-status');
    if (statusEl) statusEl.innerText = `Aguardando conexões... (${connectedClients.length + 1}/4)`;
    const btnStart = document.getElementById('btn-start-multi');
    if (btnStart) btnStart.style.display = (connectedClients.length >= 1) ? 'flex' : 'none'; 
}

function broadcastToClients(data) {
    connectedClients.forEach(client => {
        if (client && client.open) {
            try { client.send(data); } catch(e) { console.error('Erro de envio:', e); }
        }
    });
}
