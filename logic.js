/* ═══════════════════════════════════════════════════════
   LÓGICA MATEMÁTICA DO JOGO (logic.js)
═══════════════════════════════════════════════════════ */

/**
 * Retorna quais movimentos são possíveis para uma determinada mão
 */
function getMoves(hand) {
  if (!STATE.positions.length) {
    if (STATE.roundWinner === null) {
      const idx = hand.findIndex(t => t[0] === 6 && t[1] === 6);
      return idx !== -1 ? [{ idx, side: 'any' }] : hand.map((_, i) => ({ idx: i, side: 'any' }));
    }
    return hand.map((_, i) => ({ idx: i, side: 'any' }));
  }
  return hand.map((t, i) => {
    const L = t[0] === STATE.extremes[0] || t[1] === STATE.extremes[0];
    const R = t[0] === STATE.extremes[1] || t[1] === STATE.extremes[1];
    if (L && R) return { idx: i, side: 'both' };
    if (L) return { idx: i, side: 0 };
    if (R) return { idx: i, side: 1 };
    return null;
  }).filter(Boolean);
}

/**
 * Calcula a posição exata (X, Y) do centro da nova peça
 */
function calculateTilePlacement(tile, side) {
  const isD = tile[0] === tile[1];
  const c = STATE.extremes[side];
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  const vOther = tile[0] === c ? tile[1] : tile[0];
  
  const e = STATE.ends[side];
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  
  // Lógica de curva da serpente
  const maxInLine = isVertFlow ? CONFIG.GAME.MAX_VERT : CONFIG.GAME.MAX_HORIZ;
  
  if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
    if (isVertFlow) { 
      e.lastVDir = e.dir; 
      e.dir = (side === 1 ? 0 : 180); 
    } else { 
      e.dir = (e.lastVDir === 90 ? 270 : 90); 
    }
    e.lineCount = 1;
    isVertFlow = (e.dir === 90 || e.dir === 270);
  }
  e.lineCount++;

  const dx = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  const dy = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  // --- MATEMÁTICA DE CENTROS ---
  // Step é a distância do centro da peça atual ao centro da próxima
  let step = 0;
  if (isD && e.wasDouble) {
    step = CONFIG.GAME.TILE_W; // Dois carretões (18px)
  } else if (isD || e.wasDouble) {
    step = (CONFIG.GAME.TILE_L / 2) + (CONFIG.GAME.TILE_W / 2); // Normal + Carretão (27px)
  } else {
    step = CONFIG.GAME.TILE_L; // Duas normais (36px)
  }

  // Se for a PRIMEIRA peça do jogo, o centro é 0,0
  if (!STATE.positions.length) {
    const nP = { x: 0, y: 0, v1: tile[0], v2: tile[1], isV: !isD };
    e.hscX = 0;
    e.hscY = 0;
    e.wasDouble = isD;
    return { nP, vOther };
  }

  // Calcula o novo centro baseado no centro da peça anterior
  const nx = e.hscX + (step * dx);
  const ny = e.hscY + (step * dy);

  const nP = {
    x: nx,
    y: ny,
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    isV: isVertFlow ? !isD : isD
  };
  
  // Atualiza a referência de centro para a próxima peça
  e.hscX = nx;
  e.hscY = ny;
  e.wasDouble = isD;

  return { nP, vOther };
}
