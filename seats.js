/* 
   MODULO DE ASSENTOS (seats.js)
   Gerencia a escolha de posicoes no lobby multiplayer.
*/

const SeatManager = {
    // Retorna true se o assento estiver disponivel
    isAvailable: (idx) => {
        if (idx === 0) return false; // Host fixo no 0
        return !connectedClients.some(c => c.assignedIdx === idx);
    },

    // Retorna o objeto da conexao que ocupa um assento
    getOccupant: (idx) => {
        if (idx === 0) return { name: NameManager.get(0), isHost: true };
        const conn = connectedClients.find(c => c.assignedIdx === idx);
        return conn ? { name: NameManager.get(idx), isHost: false, conn } : null;
    },

    // Gera o HTML para a interface de escolha de assentos
    renderSelectionUI: () => {
        const container = document.getElementById('host-player-list');
        if (!container) return;

        // Dupla 1: Host (0) e Jogador 2
        // Dupla 2: Jogador 1 e Jogador 3
        
        let html = `
            <div class="seat-selection-grid">
                <div class="team-column">
                    <div class="team-label">DUPLA 1 (Com Host)</div>
                    ${SeatManager.getSeatHTML(0)}
                    ${SeatManager.getSeatHTML(2)}
                </div>
                <div class="team-divider">VS</div>
                <div class="team-column">
                    <div class="team-label">DUPLA 2</div>
                    ${SeatManager.getSeatHTML(1)}
                    ${SeatManager.getSeatHTML(3)}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    getSeatHTML: (idx) => {
        const occupant = SeatManager.getOccupant(idx);
        if (occupant) {
            return `<div class="seat-item occupied">${occupant.name} ${occupant.isHost ? '(HOST)' : ''}</div>`;
        } else {
            // Se for cliente, mostra botao para sentar. Se for host, apenas 'Vazio'
            if (netMode === 'client') {
                return `<button id="btn-seat-${idx}" class="seat-item empty clickable" onclick="requestSeat(${idx})">Sentar Aqui</button>`;
            }
            return `<div class="seat-item empty">Aguardando...</div>`;
        }
    }
};

// Funcao chamada pelo cliente para solicitar um assento
function requestSeat(idx) {
    if (netMode !== 'client' || !myConnToHost || !myConnToHost.open) return;
    
    // Feedback visual imediato
    const btn = document.getElementById(`btn-seat-${idx}`);
    if (btn) {
        btn.innerText = "Solicitando...";
        btn.disabled = true;
        btn.classList.remove('clickable');
    }
    
    myConnToHost.send({ type: 'request_seat', seatIdx: idx });
}
