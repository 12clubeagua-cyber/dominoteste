/* 
   ========================================================================
   DASHBOARD.JS - O PAINEL DE CONTROLE (VERSÃO BLINDADA)
   Gerencia o placar, as etiquetas de time e a barra de status superior.
   ======================================================================== 
*/

window.Dashboard = {
    /**
     * Atualiza os valores do placar e ajusta os nomes das duplas.
     */
    updateScore: function() {
        const scoreA = document.getElementById('scoreA');
        const scoreB = document.getElementById('scoreB');
        const labelA = document.getElementById('label-team-a');
        const labelB = document.getElementById('label-team-b');
        
        if (!scoreA || !scoreB || !labelA || !labelB) return;

        // Fallbacks seguros caso STATE não esteja 100% carregado
        const scores = window.STATE?.scores || [0, 0];
        const myIdx = window.myPlayerIdx ?? 0;

        // Atualiza números
        scoreA.textContent = scores[0];
        scoreB.textContent = scores[1];
        
        // Feedback visual: destaca quem está vencendo
        scoreA.classList.toggle('winning', scores[0] > scores[1]);
        scoreB.classList.toggle('winning', scores[1] > scores[0]);

        // Lógica de Perspectiva: 
        // Define se o Time A no placar é "Sua Dupla" ou "Oponentes"
        const teamLabels = (myIdx % 2 !== 0) 
            ? ["Oponentes", "Sua Dupla"] 
            : ["Sua Dupla", "Oponentes"];
            
        labelA.innerText = teamLabels[0];
        labelB.innerText = teamLabels[1];
    },

    /**
     * Define uma nova mensagem no status bar.
     * Se for o Host, propaga para todos os jogadores via rede.
     */
    setMessage: function(text, cls = '') {
        // Atualiza localmente primeiro
        this._renderStatusLocal(text, cls);

        // Se houver conexão de rede, usa o adaptador para sincronizar
        if (typeof window.Network !== 'undefined' && typeof window.Network.isHost === 'function' && window.Network.isHost()) {
            window.Network.sync({ type: 'status', text, cls });
        }
    },

    /**
     * Helper interno para processar o texto e injetar no HTML.
     * @private
     */
    _renderStatusLocal: function(text, cls) {
        const el = document.getElementById('game-status');
        if (!el) return;
        
        let displayMsg = text;
        const myIdx = window.myPlayerIdx ?? 0;
        
        // Garante que não quebre se o NameManager ainda não carregou
        const allNames = typeof window.NameManager !== 'undefined' ? window.NameManager.getAll() : {};
        
        /**
         * Tradutor de Nomes:
         * Converte "JOGADOR X" no texto para o nome real ou "VOCÊ".
         */
        Object.keys(allNames).forEach(idx => {
            const genericName = `JOGADOR ${parseInt(idx) + 1}`;
            if (displayMsg.includes(genericName)) {
                const isMe = (parseInt(idx) === myIdx);
                displayMsg = displayMsg.replace(genericName, isMe ? "VOCÊ" : allNames[idx]);
            }
        });
        
        el.innerText = displayMsg;

        // Aplica estilos CSS baseados no tipo de mensagem (ex: 'active', 'pass')
        el.className = (cls === 'active' || cls === 'pass') ? cls : '';
    },

    /**
     * Inicializa os estilos CSS baseados nas configurações globais.
     */
    init: function() {
        this.updateScore();
        
        // Sincroniza o tamanho das peças no CSS com o config.js de forma segura
        const width = window.CONFIG?.GAME?.TILE_W ?? 18;
        const height = window.CONFIG?.GAME?.TILE_L ?? 36;
        document.documentElement.style.setProperty('--tile-width', `${width}px`);
        document.documentElement.style.setProperty('--tile-height', `${height}px`);
    }
};