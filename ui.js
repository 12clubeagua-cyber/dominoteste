/* 
   ========================================================================
   UI.JS - O COORDENADOR DE INTERFACE (VERSÃO BLINDADA)
   ======================================================================== 
*/

/**
 * 1. PONTES DE COMUNICAÇÃO (WRAPPERS)
 * Usando window.* para garantir acesso seguro aos objetos em diferentes arquivos.
 */

function updateScoreDisplay() {
    if (typeof window.Dashboard !== 'undefined') window.Dashboard.updateScore();
}

function updateStatus(text, cls = '') {
    if (typeof window.Dashboard !== 'undefined') window.Dashboard.setMessage(text, cls);
}

function updateStatusLocal(text, cls) {
    if (typeof window.Dashboard !== 'undefined') window.Dashboard._renderStatusLocal(text, cls);
}

function renderBoardFromState() {
    if (typeof window.Renderer !== 'undefined') {
        window.Renderer.drawBoard();
        // Garante que a câmera se ajuste sempre que o tabuleiro for redesenhado
        syncCameraView();
    }
}

function renderHands(reveal = false) {
    if (typeof window.Renderer !== 'undefined') window.Renderer.drawHands(reveal);
}

function triggerPassVisual(pIdx) {
    if (typeof window.Renderer !== 'undefined') window.Renderer.flashPass(pIdx);
}

function executeEndRoundUI(winTeam, idx, msg, detail = '') {
    if (typeof window.FlowUI !== 'undefined') window.FlowUI.endRound(winTeam, idx, msg, detail);
}

function exitGame() {
    if (typeof window.FlowUI !== 'undefined') window.FlowUI.exitGame();
}

function changeName() {
    if (typeof window.Identity !== 'undefined') window.Identity.promptChange();
}

/**
 * 2. HELPER DE SINCRONIZAÇÃO DE CÂMERA
 * Resolve o erro de "Can't find variable" unificando os nomes.
 */
function syncCameraView() {
    if (typeof window.updateCamera === 'function') {
        window.updateCamera();
    } else if (typeof window.updateSnakeScale === 'function') {
        window.updateSnakeScale(); // Fallback caso algum código antigo chame
    }
}

// ⚠️ NOTA: A função getPips() foi removida daqui, pois agora ela vive no utils.js 
// de forma global (window.getPips) e otimizada com CSS Grid.

/**
 * 3. INICIALIZAÇÃO DO AMBIENTE VISUAL
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("UI: Inicializando componentes visuais...");

    // 1. Inicializa Identidade
    if (typeof window.Identity !== 'undefined' && typeof window.Identity.init === 'function') {
        window.Identity.init();
    }

    // 2. Inicializa Dashboard
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.init === 'function') {
        window.Dashboard.init();
    }

    // 3. Renderização Inicial (Tabuleiro Vazio)
    if (typeof window.Renderer !== 'undefined') {
        if (typeof window.Renderer.drawBoard === 'function') window.Renderer.drawBoard();
        if (typeof window.Renderer.drawHands === 'function') window.Renderer.drawHands();
        
        // Tenta centralizar a câmera no início com um pequeno atraso de segurança
        setTimeout(syncCameraView, 100);
    }
});