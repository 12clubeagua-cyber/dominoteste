/* ═══════════════════════════════════════════════════════
   LÓGICA MATEMÁTICA DO JOGO (logic.js)
═══════════════════════════════════════════════════════ */

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

function calculateTilePlacement(tile, side) {
  const isD = tile[0] === tile[1];
  const c = STATE.extremes[side];
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  const vOther = tile[0] === c ? tile[1] : tile[0];
  
  const e = STATE.ends[side];
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  
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

  // --- MATEMÁTICA DE CENTROS (SEM SOBREPOSIÇÃO) ---
  const W = CONFIG.GAME.TILE_W; // 20
  const L = CONFIG.GAME.TILE_L; // 40
  
  let step = 0;
  if (isD && e.wasDouble) {
    step = W; // Distância entre dois carretões
  } else if (isD || e.wasDouble) {
    step = (L / 2) + (W / 2); // Distância entre normal e carretão (30px)
  } else {
    step = L; // Distância entre duas normais (40px)
  }

  // Novo centro baseado no centro da peça anterior
  const nx = e.hscX + (step * dx);
  const ny = e.hscY + (step * dy);

  const nP = {
    x: nx,
    y: ny,
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    isV: isVertFlow ? !isD : isD
  };
  
  // Atualiza o "ponto de referência" para o centro desta nova peça
  e.hscX = nx;
  e.hscY = ny;
  e.wasDouble = isD;

  return { nP, vOther };
}
