/* 
    LOGICA MULTIPLAYER - VERSÃO DE DEPURAÇÃO MOBILE
    Foco: Identificar onde o script trava no celular.
*/

// --- 1. DECLARAÇÕES GLOBAIS DE SEGURANÇA ---
// Garantimos que as variáveis existam antes de qualquer função ser chamada
window.myPeer = window.myPeer || null;
window.myConnToHost = window.myConnToHost || null;
window.connectedClients = window.connectedClients || [];
window.lastRoomCode = '';

// --- 2. FERRAMENTA DE LOG VISUAL PARA CELULAR ---
function debugLog(msg, cor = "#fff") {
    const statusEl = document.getElementById('host-status') || document.getElementById('client-status');
    if (statusEl) {
        statusEl.style.color = cor;
        statusEl.innerText = `> ${msg}`;
    }
    console.log(`[DEBUG] ${msg}`);
}

/**
 * Gera um ID de 4 letras. 
 * (1 letra causa muito conflito no servidor público, travando a criação)
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
 * INICIALIZAÇÃO DO HOST
 */
function initializeHost() {
    debugLog("Iniciando função Host...", "yellow");

    // Verificação da biblioteca PeerJS
    if (typeof Peer === 'undefined') {
        debugLog("ERRO: Biblioteca PeerJS não carregada!", "red");
        return;
    }

    try {
        // Limpeza de conexões fantasmas
        if (window.myPeer) {
            debugLog("Limpando conexões antigas...");
            window.myPeer.destroy();
        }

        // Geração do ID
        const fullID = generateShortID();
        window.lastRoomCode = fullID.split('-')[1];

        // Atualização da UI
        const codeEl = document.getElementById('host-code-display');
        if (codeEl) {
            codeEl.innerText = window.lastRoomCode;
            debugLog("ID gerado na tela: " + window.lastRoomCode, "cyan");
        } else {
            debugLog("ERRO: Elemento 'host-code-display' não encontrado!", "red");
        }

        // Criando o servidor Peer
        debugLog("Conectando ao servidor PeerJS...");
        window.myPeer = new Peer(fullID);

        // Eventos do Servidor
        window.myPeer.on('open', (id) => {
            debugLog("SALA ONLINE!", "#00ff00");
            const btn = document.getElementById('btn-start-multi');
            if (btn) btn.style.display = 'flex';
        });

        window.myPeer.on('error', (err) => {
            debugLog("ERRO REDE: " + err.type, "red");
            if (err.type === 'unavailable-id') {
                debugLog("ID ocupado, tentando novo...", "orange");
                setTimeout(initializeHost, 1000);
            }
        });

        window.myPeer.on('connection', (conn) => {
            setupHostConnectionEvents(conn);
        });

    } catch (e) {
        // Captura qualquer erro de lógica ou variável inexistente
        debugLog("CRASH: " + e.message, "red");
        alert("Erro detectado: " + e.message);
    }
}

/**
 * CONFIGURAÇÃO DOS EVENTOS DE QUEM ENTRA NA SALA
 */
function setupHostConnectionEvents(conn) {
    debugLog("Alguém tentando entrar...", "white");
    
    // Define assento livre (1 a 3)
    let freeIdx = -1;
    for (let i = 1; i <= 3; i++) {
        if (!window.connectedClients.some(c => c.assignedIdx === i)) {
            freeIdx = i;
            break;
        }
    }

    if (freeIdx === -1) {
        debugLog("Sala cheia, rejeitando conexão.");
        conn.on('open', () => {
            conn.send({ type: 'error', msg: 'Sala cheia!' });
            setTimeout(() => conn.close(), 500);
        });
        return;
    }

    conn.assignedIdx = freeIdx;
    window.connectedClients.push(conn);

    conn.on('open', () => {
        debugLog(`Jogador ${freeIdx} entrou!`, "#00ff00");
        
        // Envia dados iniciais (com checagem de existência do NameManager)
        const currentNames = (typeof NameManager !== 'undefined') ? NameManager.getAll() : {};
        conn.send({ type: 'welcome', yourIdx: conn.assignedIdx, names: currentNames });
        
        if (typeof updateHostLobbyUI === 'function') updateHostLobbyUI();
    });

    conn.on('data', (data) => {
        // Interpretador de dados recebidos pelo Host
        if (data.type === 'set_name' && typeof NameManager !== 'undefined') {
            NameManager.set(conn.assignedIdx, data.name);
            if (typeof updateHostLobbyUI === 'function') updateHostLobbyUI();
        }
    });

    conn.on('close', () => {
        debugLog(`Jogador ${conn.assignedIdx} saiu.`, "orange");
        window.connectedClients = window.connectedClients.filter(c => c !== conn);
        if (typeof updateHostLobbyUI === 'function') updateHostLobbyUI();
    });
}

/**
 * CONEXÃO DO CLIENTE
 */
function connectToHost() {
    const inputEl = document.getElementById('join-code-input');
    const input = inputEl ? inputEl.value.toUpperCase().trim() : '';
    
    if (input.length < 1) {
        debugLog("Digite um código primeiro!", "orange");
        return;
    }

    debugLog("Iniciando conexão...", "yellow");

    try {
        if (window.myPeer) window.myPeer.destroy();
        window.myPeer = new Peer();

        window.myPeer.on('open', () => {
            window.lastRoomCode = input;
            window.myConnToHost = window.myPeer.connect('domino-' + input);

            window.myConnToHost.on('open', () => {
                debugLog("CONECTADO AO HOST!", "#00ff00");
                const myName = (typeof NameManager !== 'undefined') ? NameManager.get(0) : 'Convidado';
                window.myConnToHost.send({ type: 'set_name', name: myName });
            });

            window.myConnToHost.on('data', (data) => {
                if (typeof handleClientData === 'function') handleClientData(data);
            });

            window.myConnToHost.on('error', (err) => debugLog("Erro na conexão: " + err, "red"));
        });

        window.myPeer.on('error', (err) => {
            debugLog("ERRO: " + (err.type === 'peer-unavailable' ? "Sala não existe" : err.type), "red");
        });

    } catch (e) {
        debugLog("CRASH CLIENTE: " + e.message, "red");
    }
}
