/* 
    LOGICA PEERJS (multiplayer.js) - VERSÃO ESPECIALISTA
    Melhorias: Proteção contra ReferenceError, Retry recursivo de ID e Gestão de Estado.
*/

// --- 1. DECLARAÇÃO DE VARIÁVEIS GLOBAIS (ESTRUTURA DE DADOS) ---
// Estas variáveis precisam estar no topo para evitar erros de "is not defined"
let myPeer = null; 
let myConnToHost = null;
let connectedClients = []; 
let lastRoomCode = '';
let reconnectAttempts = 0;
let reconnectTimer = null;

// Configurações de conexão
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

/**
 * Gera um ID curto. Usei 4 caracteres para equilibrar facilidade e disponibilidade.
 * Com 1 caractere a chance de erro é de 95%. Com 4, cai para quase 0%.
 */
function generateShortID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'domino-' + result;
}

/**
 * INICIALIZAÇÃO DO HOST (Dono da Sala)
 */
function initializeHost() {
    if (typeof Peer === 'undefined') {
        console.error("PeerJS não carregado. Verifique o link do script no HTML.");
        return;
    }

    // Proteção: Só tenta destruir se a instância realmente existir e for um objeto Peer
    if (myPeer && typeof myPeer.destroy === 'function') {
        try { myPeer.destroy(); } catch(e) { console.warn("Erro ao limpar Peer anterior"); }
    }

    // Gera e exibe o código na interface antes de tentar a conexão
    const fullID = generateShortID();
    lastRoomCode = fullID.split('-')[1];

    const codeEl = document.getElementById('host-code-display');
    if (codeEl) codeEl.innerText = lastRoomCode;

    // Tenta registrar o ID no servidor
    myPeer = new Peer(fullID);

    // --- EVENTOS DO PEER ---

    myPeer.on('open', (id) => {
        console.log(`%c[HOST] Sala criada com sucesso! ID: ${lastRoomCode}`, "color: green; font-weight: bold;");
        const btn = document.getElementById('btn-start-multi');
        if (btn) btn.style.display = 'flex';
        
        // Atualiza status visual
        const statusEl = document.getElementById('host-status');
        if (statusEl) statusEl.innerText = "Aguardando jogadores...";
    });

    myPeer.on('error', (err) => {
        console.error("[HOST] Erro no Peer:", err.type);

        if (err.type === 'unavailable-id') {
            // Em vez de dar reload na página, tenta gerar um novo ID automaticamente
            console.warn("Código em uso. Gerando nova tentativa...");
            setTimeout(initializeHost, 500); 
        } else {
            // Outros erros (ex: rede offline)
            const statusEl = document.getElementById('host-status');
            if (statusEl) statusEl.innerText = "Erro de conexão: " + err.type;
        }
    });

    myPeer.on('connection', (conn) => {
        setupHostConnectionEvents(conn);
    });
}

/**
 * Organiza os eventos de quando um cliente se conecta ao host
 */
function setupHostConnectionEvents(conn) {
    let freeIdx = -1;
    // Busca assento livre (1 a 3, o 0 é o host)
    for (let i = 1; i <= 3; i++) {
        if (!connectedClients.some(c => c.assignedIdx === i)) {
            freeIdx = i;
            break;
        }
    }

    if (freeIdx === -1) {
        conn.on('open', () => {
            conn.send({ type: 'error', msg: 'Sala cheia!' });
            setTimeout(() => conn.close(), 500);
        });
        return;
    }

    conn.assignedIdx = freeIdx;
    connectedClients.push(conn);

    conn.on('open', () => {
        // Envia boas-vindas e sincroniza nomes
        conn.send({ 
            type: 'welcome', 
            yourIdx: conn.assignedIdx, 
            names: (typeof NameManager !== 'undefined') ? NameManager.getAll() : {} 
        });
        
        if (typeof NameManager !== 'undefined') {
            NameManager.set(conn.assignedIdx, `Jogador ${conn.assignedIdx}`);
        }
        
        updateHostLobbyUI();
        broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
    });

    conn.on('data', (data) => {
        handleHostDataReceive(conn, data);
    });

    conn.on('close', () => {
        console.warn(`[HOST] Cliente ${conn.assignedIdx} desconectou.`);
        connectedClients = connectedClients.filter(c => c !== conn);
        if (typeof NameManager !== 'undefined') {
            NameManager.set(conn.assignedIdx, 'Aguardando...');
        }
        updateHostLobbyUI();

        if (typeof STATE !== 'undefined' && !STATE.isOver) {
            STATE.isBlocked = true;
            if (typeof updateStatus === 'function') updateStatus(`Jogador ${conn.assignedIdx} caiu. Pausado.`, 'pass');
        }
    });
}

/**
 * INTERPRETADOR DE DADOS DO HOST
 */
function handleHostDataReceive(conn, data) {
    switch (data.type) {
        case 'set_name':
            NameManager.set(conn.assignedIdx, data.name);
            updateHostLobbyUI();
            broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
            break;

        case 'play_request':
            if (STATE.current === conn.assignedIdx && typeof play === 'function') {
                play(conn.assignedIdx, data.tIdx, data.side);
            }
            break;

        case 'reconnect':
            const requestedIdx = data.playerIdx;
            const seatFree = !connectedClients.some(c => c.assignedIdx === requestedIdx);
            if (seatFree && [1, 2, 3].includes(requestedIdx)) {
                conn.assignedIdx = requestedIdx;
                NameManager.set(requestedIdx, data.name);
                broadcastState();
                if (typeof updateStatus === 'function') updateStatus(`${data.name} voltou!`, 'active');
            }
            break;
    }
}

/**
 * CONEXÃO DO CLIENTE (Entrar em uma sala)
 */
function connectToHost() {
    if (typeof Peer === 'undefined') return;

    const input = document.getElementById('join-code-input').value.toUpperCase().trim();
    if (input.length < 1) return;

    const statusEl = document.getElementById('client-status');
    if (statusEl) statusEl.innerText = "Conectando...";

    if (myPeer) myPeer.destroy();
    myPeer = new Peer(); 

    myPeer.on('error', (err) => {
        console.error("[CLIENTE] Erro:", err.type);
        if (statusEl) statusEl.innerText = (err.type === 'peer-unavailable') ? "Sala não encontrada" : "Erro: " + err.type;
    });

    myPeer.on('open', () => {
        lastRoomCode = input; 
        myConnToHost = myPeer.connect('domino-' + input);

        myConnToHost.on('data', handleClientData);

        myConnToHost.on('open', () => {
            reconnectAttempts = 0;
            if (statusEl) statusEl.innerText = "Conectado!";
            myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
        });

        myConnToHost.on('close', () => {
            if (statusEl) statusEl.innerText = "Conexão perdida. Reconectando...";
            tentarReconectar();
        });
    });
}

/**
 * MOTOR DE RECONEXÃO AUTOMÁTICA
 */
function tentarReconectar() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        alert("Conexão perdida definitivamente.");
        window.location.reload();
        return;
    }

    reconnectTimer = setTimeout(() => {
        console.log(`Tentativa de reconexão ${reconnectAttempts}...`);
        myPeer = new Peer();
        myPeer.on('open', () => {
            myConnToHost = myPeer.connect('domino-' + lastRoomCode);
            myConnToHost.on('data', handleClientData);
            myConnToHost.on('open', () => {
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
 * TRANSMISSÃO GERAL (Megafone)
 */
function broadcastToClients(data) {
    connectedClients.forEach(client => {
        if (client && client.open) {
            try { client.send(data); } catch(e) { console.error('Falha no broadcast:', e); }
        }
    });
}

function updateHostLobbyUI() {
    if (typeof SeatManager !== 'undefined') SeatManager.renderSelectionUI();
    const statusEl = document.getElementById('host-status');
    if (statusEl) statusEl.innerText = `Jogadores na sala: (${connectedClients.length + 1}/4)`;
    
    const btnStart = document.getElementById('btn-start-multi');
    if (btnStart) btnStart.style.display = (connectedClients.length >= 1) ? 'flex' : 'none';
}
