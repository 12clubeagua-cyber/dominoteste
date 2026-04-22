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
  
  // CORREÇÃO: Inicializa AMBOS os lados na primeira peça
  if (!STATE.positions.length) {
    const nP = { x: 0, y: 0, v1: tile[0], v2: tile[1], isV: !isD };
    
    // Define o ponto inicial (0,0) para as duas direções de crescimento
    STATE.ends[0].hscX = 0; STATE.ends[0].hscY = 0; STATE.ends[0].wasDouble = isD;
    STATE.ends[1].hscX = 0; STATE.ends[1].hscY = 0; STATE.ends[1].wasDouble = isD;
    
    return { nP, vOther: tile[1] };
  }

  const c = STATE.extremes[side];
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  const vOther = tile[0] === c ? tile[1] : tile[0];
  
  const e = STATE.ends[side];
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  
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

  // MATEMÁTICA DE CENTROS: Calcula a distância exata para encostar sem sobrepor
  let step = 0;
  if (isD && e.wasDouble) {
    step = CONFIG.GAME.TILE_W; // 18px
  } else if (isD || e.wasDouble) {
    step = (CONFIG.GAME.TILE_L / 2) + (CONFIG.GAME.TILE_W / 2); // 27px (18+9)
  } else {
    step = CONFIG.GAME.TILE_L; // 36px
  }

  const nx = e.hscX + (step * dx);
  const ny = e.hscY + (step * dy);

  const nP = {
    x: nx, y: ny,
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    isV: isVertFlow ? !isD : isD
  };
  
  e.hscX = nx;
  e.hscY = ny;
  e.wasDouble = isD;

  return { nP, vOther };
}
