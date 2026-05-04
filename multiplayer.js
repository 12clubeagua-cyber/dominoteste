/* 
    MULTIPLAYER.JS - VERSÃO "ULTRA RESILIENTE" PARA CELULAR
    Esta versão força a exibição de erros e garante que as variáveis existam.
*/

// 1. GARANTIR QUE AS VARIÁVEIS GLOBAIS EXISTAM (Evita o erro "not defined")
window.myPeer = null;
window.connectedClients = [];
window.lastRoomCode = '';
window.netMode = 'none';

// 2. FUNÇÃO DE LOG PARA VOCÊ VER NO CELULAR
function mobileLog(msg, cor = "white") {
    const statusEl = document.getElementById('host-status');
    if (statusEl) {
        statusEl.style.color = cor;
        statusEl.innerText = "> " + msg;
    }
}

// 3. CAPTURAR QUALQUER ERRO DE QUALQUER ARQUIVO (Aparecerá um alerta no seu celular)
window.onerror = function(msg, url, line) {
    alert("ERRO NO JS: " + msg + "\nLinha: " + line + "\nArquivo: " + url);
    return false;
};

/**
 * GERA O CÓDIGO DA SALA
 */
function generateShortID() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removi 'I' e 'O' para não confundir com 1 e 0
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'domino-' + result;
}

/**
 * FUNÇÃO PRINCIPAL: INICIALIZAR HOST
 */
function initializeHost() {
    mobileLog("Iniciando Host...", "yellow");

    // Verifica se a biblioteca PeerJS carregou
    if (typeof Peer === 'undefined') {
        alert("CRÍTICO: A biblioteca PeerJS não carregou! Verifique sua internet ou o link no HTML.");
        return;
    }

    try {
        // Limpa conexões anteriores
        if (window.myPeer) {
            window.myPeer.destroy();
            window.myPeer = null;
        }

        // Gera o ID
        const fullID = generateShortID();
        window.lastRoomCode = fullID.split('-')[1];

        // --- AQUI É ONDE MUDA O "GERANDO..." ---
        const codeDisplay = document.getElementById('host-code-display');
        if (codeDisplay) {
            codeDisplay.innerText = window.lastRoomCode;
            codeDisplay.style.color = "#00ff00"; // Fica verde quando gera
            mobileLog("Código gerado com sucesso!", "#00ff00");
        } else {
            alert("ERRO: O elemento 'host-code-display' não existe no seu HTML!");
        }

        // Cria o Peer
        mobileLog("Conectando ao servidor Peer...", "cyan");
        window.myPeer = new Peer(fullID);

        window.myPeer.on('open', function(id) {
            mobileLog("SALA ONLINE!", "#00ff00");
            const btnStart = document.getElementById('btn-start-multi');
            if (btnStart) btnStart.style.display = 'flex';
        });

        window.myPeer.on('error', function(err) {
            mobileLog("ERRO DE REDE: " + err.type, "red");
            if (err.type === 'unavailable-id') {
                mobileLog("ID ocupado, tentando outro...", "orange");
                setTimeout(initializeHost, 1000);
            }
        });

        window.myPeer.on('connection', function(conn) {
            setupHostEvents(conn);
        });

    } catch (e) {
        alert("ERRO DENTRO DO INITIALIZE: " + e.message);
    }
}

/**
 * CONFIGURAÇÕES DE QUEM ENTRA (CLIENTE)
 */
function connectToHost() {
    const input = document.getElementById('join-code-input').value.toUpperCase().trim();
    if (!input) {
        alert("Digite o código da sala!");
        return;
    }

    mobileLog("Conectando à sala: " + input, "yellow");

    try {
        if (window.myPeer) window.myPeer.destroy();
        window.myPeer = new Peer();

        window.myPeer.on('open', function() {
            const conn = window.myPeer.connect('domino-' + input);
            setupClientEvents(conn);
        });

        window.myPeer.on('error', function(err) {
            alert("Erro ao conectar: " + err.type);
        });
    } catch (e) {
        alert("Erro no cliente: " + e.message);
    }
}

// Funções vazias para evitar erros se os arquivos ainda não carregaram
function setupHostEvents(conn) { console.log("Novo cliente conectado"); }
function setupClientEvents(conn) { console.log("Conectado ao host"); }
