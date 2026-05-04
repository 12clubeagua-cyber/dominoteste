/* 
   MODULO DE ASSENTOS (seats.js)
   Gerencia a escolha de posicoes no lobby multiplayer.
*/

// Cria o objeto principal que vai gerenciar quem senta onde na mesa virtual antes do jogo começar
const SeatManager = {
    // Retorna true se o assento estiver disponivel
    // Método para verificar se uma cadeira específica está livre para alguém sentar
    isAvailable: (idx) => {
        // Se o índice consultado for o da cadeira reservada do dono da sala (Host), retorna falso pois ela nunca fica vaga
        if (idx === 0) return false; // Host fixo no 0
        // Varre a lista de clientes conectados e retorna verdadeiro apenas se ninguém estiver ocupando essa cadeira
        return !connectedClients.some(c => c.assignedIdx === idx);
    },

    // Retorna o objeto da conexao que ocupa um assento
    // Método para descobrir os dados do jogador que está sentado em uma cadeira específica
    getOccupant: (idx) => {
        // Se a cadeira consultada for a do criador da sala, retorna os dados dele direto do gerenciador local
        if (idx === 0) return { name: NameManager.get(0), isHost: true };
        // Busca na lista de clientes conectados a conexão que tem esse índice de cadeira atrelado a ela
        const conn = connectedClients.find(c => c.assignedIdx === idx);
        // Se achar alguém ali, devolve um objeto com o apelido e a conexão da rede; se a cadeira estiver vazia, devolve nulo
        return conn ? { name: NameManager.get(idx), isHost: false, conn } : null;
    },

    // Gera o HTML para a interface de escolha de assentos
    // Método que desenha o painel visual na tela de espera para o pessoal escolher o próprio time
    renderSelectionUI: () => {
        // Busca a div de interface onde a lista de jogadores aparece na tela do criador da sala
        const hostContainer = document.getElementById('host-player-list');
        // Busca a div de interface onde a lista aparece na tela do convidado
        const clientContainer = document.getElementById('client-player-list');
        
        // Se não encontrar nenhuma das duas áreas ativas na tela, aborta a função para evitar erros
        if (!hostContainer && !clientContainer) return;

        // Dupla 1: Host (0) e Jogador 2 (Parceiro de frente)
        // Dupla 2: Jogador 1 e Jogador 3 (Inimigos das laterais)
        
        // Inicia a criação de um grande bloco de texto HTML (Template String) com a estrutura das equipes
        const html = `
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

        // Se a tela do dono da sala estiver aberta no momento, injeta o visual criado acima dentro dela
        if (hostContainer) hostContainer.innerHTML = html;
        // Se a tela do convidado estiver aberta, injeta o HTML idêntico nela também
        if (clientContainer) clientContainer.innerHTML = html;
    },

    // Método auxiliar que constrói o código visual HTML de uma única cadeira da mesa
    getSeatHTML: (idx) => {
        // Usa a função criada acima para checar se já tem alguém sentado nessa cadeira
        const occupant = SeatManager.getOccupant(idx);
        // Se houver alguém sentado (ocupada)
        if (occupant) {
            // Retorna a caixa estática travada mostrando o nome da pessoa e um aviso em anexo se ela for a dona da sala
            return `<div class="seat-item occupied">${occupant.name} ${occupant.isHost ? '(HOST)' : ''}</div>`;
        // Se a cadeira estiver completamente vazia
        } else {
            // Se for cliente, mostra botao para sentar. Se for host, apenas 'Vazio'
            // Verifica se quem está olhando para a tela de espera é um jogador convidado
            if (netMode === 'client') {
                // Se for convidado, cria um botão clicável com a função de pedir para sentar no assento correspondente
                return `<button id="btn-seat-${idx}" class="seat-item empty clickable" onclick="requestSeat(${idx})">Sentar Aqui</button>`;
            }
            // Se quem está olhando for o dono da sala, mostra apenas a cadeira vazia e aguardando (o dono não pode trocar de lugar)
            return `<div class="seat-item empty">Aguardando...</div>`;
        }
    }
};

// Funcao chamada pelo cliente para solicitar um assento
// Função ativada exclusivamente quando o convidado clica no botão "Sentar Aqui" do HTML acima
function requestSeat(idx) {
    // Trava de segurança pesada: só prossegue se o usuário for convidado e se o duto de conexão com a sala estiver aberto
    if (netMode !== 'client' || !myConnToHost || !myConnToHost.open) return;
    
    // Feedback visual imediato
    // Busca o próprio botão que o jogador acabou de clicar para interagir com ele
    const btn = document.getElementById(`btn-seat-${idx}`);
    // Se o botão existir fisicamente na tela
    if (btn) {
        // Troca o texto do botão para mostrar que o pedido está sendo processado pelo computador remoto
        btn.innerText = "Solicitando...";
        // Desativa o botão para evitar que o jogador ansioso clique várias vezes e mande vários pedidos
        btn.disabled = true;
        // Tira o efeito visual de "clicável" (hover) para confirmar o bloqueio
        btn.classList.remove('clickable');
    }
    
    // Dispara um pacote de dados para o computador do dono da sala oficializando o pedido daquela cadeira
    myConnToHost.send({ type: 'request_seat', seatIdx: idx });
}
