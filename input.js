/* 
   ========================================================================
   INPUT.JS - CONTROLE DE ENTRADA E INTERATIVIDADE (VERSAO BLINDADA)
   Gerencia cliques nas pecas, redimensionamento de tela e menus de escolha.
   ======================================================================== 
*/

/**
 * 1. EVENTOS GERAIS DE SISTEMA
 * Trata mudancas no ambiente, como girar o celular ou redimensionar a aba.
 */
window.handleResize = function() {
    // Se houver pecas na mesa, ajusta o zoom e redesenha para nao cortar o jogo
    if (window.STATE?.positions?.length > 0) {
        
        // Usa a funcao de camera unificada do ui.js/animations.js
        if (typeof window.syncCameraView === 'function') {
            window.syncCameraView();
        } else if (typeof window.updateCamera === 'function') {
            window.updateCamera();
        }
        
        // Atualiza a renderizacao de forma segura
        if (typeof window.renderBoardFromState === 'function') {
            window.renderBoardFromState();
        }
    }
};

window.addEventListener('resize', window.handleResize);

/**
 * 2. GESTAO DE INTERATIVIDADE (CLIQUES)
 * Controla quais pecas podem ser tocadas e limpa ouvintes antigos.
 */

window.removePlayableListeners = function() {
    const myIdx = window.myPlayerIdx ?? 0;
    const hand = window.STATE?.hands?.[myIdx];
    
    if (!Array.isArray(hand)) return;

    hand.forEach((_, idx) => {
        const el = document.getElementById(`my-tile-${idx}`);
        if (el) {
            el.classList.remove('playable');
            el.onclick = null; // Mata o evento de clique
        }
    });
};

window.highlight = function(moves) {
    // Limpeza preventiva em todas as pecas para evitar fantasmas
    document.querySelectorAll('.tile').forEach(el => el.classList.remove('playable'));
    window.removePlayableListeners();

    moves.forEach(move => {
        const el = document.getElementById(`my-tile-${move.idx}`);
        if (!el) return;
        
        el.classList.add('playable');
        
        el.onclick = () => {
            if (typeof window.safeAudioInit === 'function') window.safeAudioInit();
            if (window.STATE?.isBlocked) return;

            // Trava de seguranca imediata para evitar bugs de multiplos toques rapidos (comum em touch)
            window.STATE.isBlocked = true;

            // Feedback visual instantaneo
            document.querySelectorAll('.tile.playable').forEach(t => t.classList.remove('playable'));
            const hand0 = document.getElementById('hand-0');
            if (hand0) hand0.classList.remove('active-turn');

            window.removePlayableListeners();

            // Forca o navegador a processar as mudancas visuais antes da logica pesada
            void document.body.offsetHeight; 

            requestAnimationFrame(() => {
                const extremesAreDiff = window.STATE?.extremes?.[0] !== window.STATE?.extremes?.[1];
                const hasPositions = (window.STATE?.positions?.length > 0);
                const needsPicker = move.side === 'both' && extremesAreDiff && hasPositions;

                const picker = document.getElementById('side-picker');
                if (picker) picker.style.display = 'none';

                if (needsPicker) {
                    window.STATE.pendingIdx = move.idx;
                    if (picker) picker.style.display = 'flex';
                } else {
                    // Normaliza o lado: se for 'both' ou 'any' mas as pontas forem iguais, joga no lado 0
                    const side = (move.side === 'both' || move.side === 'any') ? 0 : move.side;
                    if (typeof window.play === 'function') {
                        window.play(window.myPlayerIdx ?? 0, move.idx, side);
                    }
                }
            });
        };
    });
};

/**
 * 3. FLUXO DE ESCOLHA (PICKER)
 * Gerencia os botoes de "Cima/Baixo" ou "Esquerda/Direita" quando a peca serve nos dois lados.
 * Estas funcoes SAO chamadas pelo HTML via onclick, entao o window.* e essencial.
 */

window.executeMove = function(side) {
    const picker = document.getElementById('side-picker');
    if (picker) picker.style.display = 'none';

    if (window.STATE && window.STATE.pendingIdx !== null) {
        const idx = window.STATE.pendingIdx;
        window.STATE.pendingIdx = null; // Limpa memoria temporaria
        
        if (typeof window.play === 'function') {
            window.play(window.myPlayerIdx ?? 0, idx, side);
        }
    }
};

window.cancelMove = function() {
    const picker = document.getElementById('side-picker');
    if (picker) picker.style.display = 'none';
    
    if (window.STATE) {
        window.STATE.pendingIdx = null;
        window.STATE.isBlocked = false; // Destrava o jogo para o jogador tentar de novo
        
        const myIdx = window.myPlayerIdx ?? 0;
        const hand = window.STATE.hands?.[myIdx];
        
        // Refaz o brilho nas pecas para o usuario escolher de novo
        if (Array.isArray(hand) && typeof window.getMoves === 'function') {
            const moves = window.getMoves(hand);
            if (moves.length > 0 && typeof window.highlight === 'function') {
                window.highlight(moves);
            }
        }
    }
};