/* 
   ========================================================================
   LOGIC.JS - AS REGRAS E A MATEMATICA DO JOGO (VERSAO BLINDADA)
   Versao Otimizada: Alinhamento L-Shape, Gestao de Extremos e Bounding Box.
   ======================================================================== 
*/

/**
 * 1. VALIDACAO DE JOGADAS
 * Analisa a mao do jogador e identifica onde as pecas podem ser jogadas.
 */
window.getMoves = function(hand) {
    if (!Array.isArray(hand)) return [];

    // Caso Inicial: Se a mesa estiver vazia
    if (!window.STATE?.positions?.length) {
        if (window.STATE?.roundWinner === null) {
            // Regra da Bucha de Sena (6-6) para comecar o jogo
            const senaIdx = hand.findIndex(t => t[0] === 6 && t[1] === 6);
            return senaIdx !== -1 
                ? [{ idx: senaIdx, side: 'any' }] 
                : hand.map((_, i) => ({ idx: i, side: 'any' }));
        }
        return hand.map((_, i) => ({ idx: i, side: 'any' }));
    }

    const extremes = window.STATE?.extremes;
    if (!extremes || extremes.length < 2) return [];

    return hand.map((t, i) => {
        const matchLeft = (t[0] === extremes[0] || t[1] === extremes[0]);
        const matchRight = (t[0] === extremes[1] || t[1] === extremes[1]);

        if (matchLeft && matchRight) return { idx: i, side: 'both' };
        if (matchLeft) return { idx: i, side: 0 };
        if (matchRight) return { idx: i, side: 1 };
        return null;
    }).filter(Boolean);
};

/**
 * 2. GEOMETRIA E POSICIONAMENTO (CORNER HINGE ENGINE)
 * Calcula as coordenadas X, Y e a rotacao da peca na mesa.
 */
window.calculateTilePlacement = function(tile, side) {
    if (!Array.isArray(tile) || tile.length < 2) return null;
    const normalizedSide = (typeof side !== 'number' || side < 0 || side > 1) ? 0 : side;

    const isD = tile[0] === tile[1];
    const TW = window.CONFIG?.GAME?.TILE_W ?? 18;
    const TL = window.CONFIG?.GAME?.TILE_L ?? 36;

    // Inicializa os pontos de controle das extremidades se necessario
    if (!window.STATE.ends || window.STATE.ends.length < 2) {
        window.STATE.ends = [
            { hscX: 0, hscY: 0, dir: 180, lineCount: 0, wasDouble: false, lastVDir: 270 },
            { hscX: 0, hscY: 0, dir: 0,   lineCount: 0, wasDouble: false, lastVDir: 90 }
        ];
    }

    // --- CASO A: Primeira Peca da Mesa (Centro 0,0) ---
    if (!window.STATE.positions.length) {
        const nP = { x: 0, y: 0, v1: tile[0], v2: tile[1], isV: !isD };
        window.STATE.ends[0].wasDouble = isD;
        window.STATE.ends[1].wasDouble = isD;
        window.updateExtremes(tile, null);
        return { nP, vOther: tile[1] };
    }

    // --- CASO B: Pecas Subsequentes ---
    const currentExtremeValue = window.STATE.extremes[normalizedSide];
    const vMatch = (tile[0] === currentExtremeValue) ? tile[0] : tile[1];
    const vOther = (tile[0] === currentExtremeValue) ? tile[1] : tile[0];
    const e = window.STATE.ends[normalizedSide];

    const prevDir = e.dir; 

    // Logica de Curva (Snake Flow)
    let isVertFlow = (e.dir === 90 || e.dir === 270);
    const maxInLine = isVertFlow ? (window.CONFIG?.GAME?.MAX_VERT ?? 6) : (window.CONFIG?.GAME?.MAX_HORIZ ?? 6);

    let isTurning = false;
    // So vira se atingiu o limite, nao for bucha e a anterior nao foi bucha
    if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
        isTurning = true;
        if (isVertFlow) {
            e.lastVDir = e.dir;
            e.dir = (normalizedSide === 1 ? 0 : 180); // Vira para horizontal
        } else {
            e.dir = (e.lastVDir === 90 ? 270 : 90); // Vira para vertical
        }
        e.lineCount = 0;
        isVertFlow = (e.dir === 90 || e.dir === 270);
    }
    e.lineCount++;

    // Vetores de Direcao (Onde a peca anterior aponta e para onde a nova vai)
    const oldDX = (prevDir === 0) ? 1 : (prevDir === 180 ? -1 : 0);
    const oldDY = (prevDir === 90) ? 1 : (prevDir === 270 ? -1 : 0);
    const dx = (e.dir === 0) ? 1 : (e.dir === 180 ? -1 : 0);
    const dy = (e.dir === 90) ? 1 : (e.dir === 270 ? -1 : 0);

    let nx, ny;

    if (!isTurning) {
        // Alinhamento em Reta
        const prevHalf = e.wasDouble ? (TW / 2) : (TL / 2);
        const currentHalf = isD ? (TW / 2) : (TL / 2);
        
        // ADICIONAMOS +2 para evitar que as bordas (1px cada) se sobreponham
        const totalDist = prevHalf + currentHalf + 2; 

        nx = e.hscX + (totalDist * dx);
        ny = e.hscY + (totalDist * dy);
    } else {
        // Alinhamento em Quina (L-Shape)
        // Recua para a quina da peca anterior e projeta para o lado
        const cornerOffset = (TL / 2) - (TW / 2); 
        const projection = (TL / 2) + (TW / 2) + 2; // +2 aqui tambem

        nx = e.hscX + (cornerOffset * oldDX) + (projection * dx);
        ny = e.hscY + (cornerOffset * oldDY) + (projection * dy);
    }

    // Objeto de Posicao Final
    const nP = {
        x: nx, y: ny,
        // Inverte visualmente v1/v2 dependendo da direcao para os numeros baterem
        v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
        v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
        isV: isVertFlow ? !isD : isD
    };

    // Atualiza o estado da extremidade
    e.hscX = nx;
    e.hscY = ny;
    e.wasDouble = isD;
    window.updateExtremes(tile, normalizedSide);

    return { nP, vOther };
};

/**
 * 3. GESTAO DE EXTREMOS
 * Sincroniza os numeros disponiveis nas pontas do jogo.
 */
window.updateExtremes = function(tile, side) {
    if (side === null) {
        window.STATE.extremes = [tile[0], tile[1]];
        return;
    }
    const current = window.STATE.extremes[side];
    window.STATE.extremes[side] = (tile[0] === current) ? tile[1] : tile[0];
};

/**
 * 4. CALCULO DE LIMITES (BOUNDING BOX)
 * Necessario para o sistema de auto-zoom e centralizacao.
 */
window.getSnakeBounds = function() {
    if (!window.STATE.positions || window.STATE.positions.length === 0) 
        return { width: 0, height: 0, centerX: 0, centerY: 0 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    window.STATE.positions.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });

    // Adiciona uma margem de seguranca baseada no tamanho da peca
    const padding = 50;
    return {
        minX, maxX, minY, maxY,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
};