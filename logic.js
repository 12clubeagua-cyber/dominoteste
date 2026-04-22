/* ═══════════════════════════════════════════════════════
   LÓGICA MATEMÁTICA DO JOGO (logic.js)
═══════════════════════════════════════════════════════ */

/**
 * Filtra quais peças da mão podem ser jogadas
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
 * Calcula a posição exata (X, Y) e orientação da nova peça na mesa
 */
function calculateTilePlacement(tile, side) {
  const isD = tile[0] === tile[1]; // A peça atual é carretão?
  const c = STATE.extremes[side];
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  const vOther = tile[0] === c ? tile[1] : tile[0];
  
  const e = STATE.ends[side];
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  
  // Regra de quebra de linha (serpente) baseada no CONFIG
  const maxInLine = isVertFlow ? (CONFIG.GAME.MAX_VERT || 6) : (CONFIG.GAME.MAX_HORIZ || 2);
  
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

  // --- CÁLCULO DE DISTÂNCIA PARA EVITAR SOBREPOSIÇÃO ---
  // A distância entre os centros depende se as peças são carretões ou normais
  let step = 27; // Distância padrão (Normal + Carretão)
  if (!isD && !e.wasDouble) step = 36; // Distância entre duas peças normais
  if (isD && e.wasDouble) step = 18;   // Distância entre dois carretões

  const chX = e.hscX + step * dx;
  const chY = e.hscY + step * dy;

  let cx, cy, newHscX, newHscY;
  
  if (isD) { 
    // Carretões ficam centralizados no ponto de conexão
    cx = chX; 
    cy = chY; 
    newHscX = chX; 
    newHscY = chY; 
  } else { 
    // Peças normais: o centro geométrico fica a 9px do ponto de conexão
    cx = chX + (9 * dx); 
    cy = chY + (9 * dy); 
    newHscX = chX + (18 * dx); 
    newHscY = chY + (18 * dy); 
  }

  const nP = {
    x: cx, y: cy,
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    isV: isVertFlow ? !isD : isD
  };
  
  return { nP, newHscX, newHscY, vOther, isD };
}
