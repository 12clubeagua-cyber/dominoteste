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
  
  // Regra de quebra de linha (serpente)
  const maxInLine = isVertFlow ? 6 : 2;
  if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
    if (isVertFlow) { e.lastVDir = e.dir; e.dir = side === 1 ? 0 : 180; }
    else { e.dir = e.lastVDir === 90 ? 270 : 90; }
    e.lineCount = 1;
    isVertFlow = (e.dir === 90 || e.dir === 270);
  }
  e.lineCount++;

  const dx = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  const dy = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;
  const chX = e.hscX + 18 * dx, chY = e.hscY + 18 * dy;

  let cx, cy, newHscX, newHscY;
  if (isD) { 
    cx = chX; cy = chY; newHscX = chX; newHscY = chY; 
  } else { 
    cx = (chX + (chX + 18 * dx)) / 2; 
    cy = (chY + (chY + 18 * dy)) / 2; 
    newHscX = chX + 18 * dx; 
    newHscY = chY + 18 * dy; 
  }

  const nP = {
    x: cx, y: cy,
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    isV: isVertFlow ? !isD : isD
  };
  
  return { nP, newHscX, newHscY, vOther, isD };
}
