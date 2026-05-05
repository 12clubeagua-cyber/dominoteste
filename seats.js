/* 
   ========================================================================
   SEATS.JS - GERENCIAMENTO DE ASSENTOS E TIMES (VERSÃO BLINDADA)
   Controla a ocupação das cadeiras e a formação das duplas no lobby.
   ======================================================================== 
*/

/**
 * 1. LÓGICA DE OCUPAÇÃO
 * Exportada globalmente para ser acessada pelo motor de rede e lobby.
 */
window.SeatManager = {
    // Verifica se uma cadeira específica (0-3) está livre
    isAvailable: (idx) => {
        if (idx === 0) return false; // Cadeira 0 é reservada ao Host
        const clients = window.connectedClients || [];
        return !clients.some(c => c.assignedIdx === idx);
    },

    // Retorna os dados (nome, conexão) de quem ocupa o assento
    getOccupant: (idx) => {
        // Caso especial: Host (Sempre na cadeira 0)
        if (idx === 0) {
            const hostName = (typeof window.NameManager !== 'undefined') ? window.NameManager.get(0) : "Host";
            return { name: hostName, isHost: true };
        }
        
        // Busca nos clientes conectados
        const clients = window.connectedClients || [];
        const conn = clients.find(c => c.assignedIdx === idx);
        
        if (conn) {
            const pName = (typeof window.NameManager !== 'undefined') ? window.NameManager.get(idx) : `Jogador ${idx}`;
            return { name: pName, isHost: false, conn };
        }
        return null;
    },

    /**
     * 2. MOTOR DE INTERFACE (UI)
     * Gera o visual das duplas e botões de seleção.
     */
    renderSelectionUI: () => {
        const hostContainer = document.getElementById('host-player-list');
        const clientContainer = document.getElementById('client-player-list');
        
        if (!hostContainer && !clientContainer) return;

        // Estrutura das Duplas: 
        // Dupla 1: Posições 0 e 2 | Dupla 2: Posições 1 e 3
        const html = `
            <div class="seat-selection-grid">
                <div class="team-column">
                    <div class="team-label">DUPLA 1 (Com Host)</div>
                    ${window.SeatManager.getSeatHTML(0)}
                    ${window.SeatManager.getSeatHTML(2)}
                </div>
                <div class="team-divider">VS</div>
                <div class="team-column">
                    <div class="team-label">DUPLA 2</div>
                    ${window.SeatManager.getSeatHTML(1)}
                    ${window.SeatManager.getSeatHTML(3)}
                </div>
            </div>
        `;

        if (hostContainer) hostContainer.innerHTML = html;
        if (clientContainer) clientContainer.innerHTML = html;
    },

    // Gera o HTML individual de cada "quadrado" de assento
    getSeatHTML: (idx) => {
        const occupant = window.SeatManager.getOccupant(idx);
        const currentMode = window.netMode || 'offline';
        
        if (occupant) {
            // Assento Ocupado
            return `<div class="seat-item occupied">
                        ${occupant.name} ${occupant.isHost ? '<span style="color:var(--gold); font-size:10px;">(HOST)</span>' : ''}
                    </div>`;
        } else {
            // Assento Vazio: Diferencia comportamento entre Host e Cliente
            if (currentMode === 'client') {
                // IMPORTANTE: Chamada direta para o escopo window no evento onclick
                return `<button id="btn-seat-${idx}" 
                                class="seat-item empty clickable" 
                                onclick="window.requestSeat(${idx})">
                            Sentar Aqui
                        </button>`;
            }
            return `<div class="seat-item empty">Aguardando...</div>`;
        }
    }
};

/**
 * 3. COMUNICAÇÃO DE PEDIDOS
 * Função global chamada pelos botões de UI para solicitar troca.
 */
window.requestSeat = function(idx) {
    const currentMode = window.netMode || 'offline';
    const conn = window.myConnToHost;

    // Segurança: Apenas clientes conectados podem solicitar assentos
    if (currentMode !== 'client' || !conn || !conn.open) return;
    
    // Feedback visual imediato (Optimistic UI)
    const btn = document.getElementById(`btn-seat-${idx}`);
    if (btn) {
        btn.innerText = "Solicitando...";
        btn.disabled = true;
        btn.classList.remove('clickable');
        btn.style.opacity = '0.5';
    }
    
    // Envia o pacote de dados para o Host validar
    conn.send({ type: 'request_seat', seatIdx: idx });
};