/* 
   ========================================================================
   RENDERER.JS - O ARTISTA (VERSÃO BLINDADA E CORRIGIDA)
   Transforma os dados do STATE em elementos visuais (HTML/DOM).
   ======================================================================== 
*/

window.Renderer = {
    /**
     * Renderiza o tabuleiro (as pecas jogadas).
     */
    drawBoard: function() {
        const board = document.getElementById('snake');
        if (!board) return;

        // 1. Limpeza Seletiva: Preserva pecas em animacao para evitar "piscadas"
        const staticTiles = board.querySelectorAll('.tile:not(.moving-proxy):not(.temp-hidden)');
        staticTiles.forEach(tile => tile.remove());

        // Carrega configuracoes globais de forma segura
        const W = window.CONFIG?.GAME?.TILE_W ?? 18;
        const L = window.CONFIG?.GAME?.TILE_L ?? 36;
        const positions = window.STATE?.positions || [];
        const isOver = window.STATE?.isOver || false;

        // 2. Renderizacao das pecas no tabuleiro
        positions.forEach((nP, i) => {
            const el = document.createElement('div');
            
            const isLast = (i === positions.length - 1 && !isOver);
            el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'} ${isLast ? 'last-move' : ''}`;

            // 3. Posicionamento Absoluto (Crucial para nao empilhar no canto)
            const offX = nP.isV ? (W / 2) : (L / 2);
            const offY = nP.isV ? (L / 2) : (W / 2);

            el.style.position = 'absolute';
            el.style.left = `${nP.x - offX}px`;
            el.style.top  = `${nP.y - offY}px`;

            // Usamos window.Renderer para garantir o contexto correto
            el.innerHTML = `
                <div class="half">${window.Renderer._getPips(nP.v1)}</div>
                <div class="half">${window.Renderer._getPips(nP.v2)}</div>
            `;

            board.appendChild(el);
        });

        // 4. Sincroniza a câmera no final do desenho do tabuleiro
        if (typeof window.updateCamera === 'function') {
            window.updateCamera();
        }
    },

    /**
     * Renderiza as maos dos jogadores.
     */
    drawHands: function(reveal = false) {
        const picker = document.getElementById('side-picker');
        if (picker) picker.style.display = 'none';

        const myIdx = window.myPlayerIdx ?? 0;
        const currentTurn = window.STATE?.current ?? 0;
        const isOver = window.STATE?.isOver ?? false;
        const isBlocked = window.STATE?.isBlocked ?? false;

        for (let i = 0; i < 4; i++) {
            const viewPos = (i - myIdx + 4) % 4;
            const container = document.getElementById(`hand-${viewPos}`);
            if (!container) continue;

            const isSide = (viewPos === 1 || viewPos === 3);
            const isActive = (i === currentTurn && !isOver && !isBlocked);
            const isPassing = window.visualPass && window.visualPass[i];

            container.className = `hand hand-${viewPos} ${isSide ? 'hand-side' : 'hand-horiz'} 
                                   ${isActive ? 'active-turn' : ''} 
                                   ${isPassing ? 'hand-passed' : ''}`;

            container.innerHTML = '';

            // A) Nome do Jogador
            const label = document.createElement('div');
            label.className = 'player-name-tag';
            const playerName = typeof window.NameManager !== 'undefined' ? window.NameManager.get(i) : `Jogador ${i}`;
            label.innerHTML = `<span>${playerName}</span>`;
            container.appendChild(label);

            // B) Rack de Pecas
            const rack = document.createElement('div');
            rack.className = 'tiles-rack';
            container.appendChild(rack);

            const isMe = (i === myIdx);
            const handData = window.STATE?.hands?.[i] || [];

            if (isMe || reveal) {
                handData.forEach((t, idx) => {
                    const tileEl = window.Renderer._createTileElement(t, isSide, isMe, idx);
                    rack.appendChild(tileEl);
                });
            } else {
                const count = window.STATE?.handSize?.[i] || 0;
                for (let k = 0; k < count; k++) {
                    const darkTile = document.createElement('div');
                    darkTile.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} tile-back`;
                    darkTile.innerHTML = '<div class="half"></div><div class="half"></div>';
                    rack.appendChild(darkTile);
                }
            }
        }

        window.Renderer._checkLocalInteraction();
    },

    /**
     * Gerencia o feedback visual de "Passou a vez".
     */
    flashPass: function(pIdx) {
        if (!window.visualPass) window.visualPass = [false, false, false, false];
        
        window.visualPass[pIdx] = true;
        window.Renderer.drawHands(window.STATE?.isOver);
        
        const passDelay = window.CONFIG?.GAME?.PASS_DISPLAY_TIME ?? 1000;
        
        setTimeout(() => {
            window.visualPass[pIdx] = false;
            window.Renderer.drawHands(window.STATE?.isOver);
        }, passDelay);
    },

    /**
     * @private Cria o elemento HTML de uma peca individual.
     */
    _createTileElement: function(tile, isSide, isMe, idx) {
        const el = document.createElement('div');
        const isDouble = tile[0] === tile[1];
        const pipColor = isMe && isDouble ? 'var(--red)' : null;
        
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${isDouble ? 'tile-double' : ''}`;
        if (isMe) el.id = `my-tile-${idx}`;

        el.innerHTML = `
            <div class="half">${window.Renderer._getPips(tile[0], pipColor)}</div>
            <div class="half">${window.Renderer._getPips(tile[1], pipColor)}</div>
        `;
        return el;
    },

    /**
     * @private Verifica e destaca jogadas possiveis para o jogador local.
     */
    _checkLocalInteraction: function() {
        const myIdx = window.myPlayerIdx ?? 0;
        const isMyTurn = (window.STATE?.current === myIdx && !window.STATE?.isOver && !window.STATE?.isBlocked);
        
        if (isMyTurn && typeof window.getMoves === 'function') {
            const moves = window.getMoves(window.STATE.hands[myIdx]);
            if (moves.length > 0 && typeof window.highlight === 'function') {
                window.highlight(moves);
            }
        }
    },

    /**
     * @private Acessa a funcao global de renderizacao de pontos (pips).
     */
    _getPips: function(val, color) {
        if (typeof window.getPips === 'function') {
            return window.getPips(val, color);
        }
        return `<span style="color:var(--bg); font-weight:bold; font-size:10px;">${val}</span>`;
    }
};