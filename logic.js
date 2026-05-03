/* 
   LOGICA MATEMATICA DO JOGO (logic.js)
 */

function getMoves(hand) {
  if (!Array.isArray(hand)) return [];
  if (!STATE?.positions?.length) {
    if (STATE?.roundWinner === null) {
      const idx = hand.findIndex(t => t[0] === 6 && t[1] === 6);
      return idx !== -1 ? [{ idx, side: 'any' }] : hand.map((_, i) => ({ idx: i, side: 'any' }));
    }
    return hand.map((_, i) => ({ idx: i, side: 'any' }));
  }
  const extremes = STATE?.extremes;
  if (!extremes || extremes.length < 2) return [];

  return hand.map((t, i) => {
    const L = t[0] === extremes[0] || t[1] === extremes[0];
    const R = t[0] === extremes[1] || t[1] === extremes[1];
    if (L && R) return { idx: i, side: 'both' };
    if (L) return { idx: i, side: 0 };
    if (R) return { idx: i, side: 1 };
    return null;
  }).filter(Boolean);
}

function calculateTilePlacement(tile, side) {
  if (!Array.isArray(tile) || tile.length < 2) {
    console.warn('calculateTilePlacement: tile invalido', tile);
    return null;
  }
  
  if (typeof side !== 'number' || side < 0 || side > 1) {
    console.warn('calculateTilePlacement: side invalido', side);
    side = 0;  // Default seguro
  }

  const isD = tile[0] === tile[1];

  if (!STATE.ends || STATE.ends.length < 2) {
    STATE.ends = [
      { hscX: 0, hscY: 0, dir: 0, lineCount: 0, wasDouble: false, lastVDir: 90 },
      { hscX: 0, hscY: 0, dir: 180, lineCount: 0, wasDouble: false, lastVDir: 270 }
    ];
  }

  if (!STATE.positions.length) {
    const nP = { x: 0, y: 0, v1: tile[0], v2: tile[1], isV: !isD };
    STATE.ends[0].hscX = 0; STATE.ends[0].hscY = 0; STATE.ends[0].wasDouble = isD;
    STATE.ends[1].hscX = 0; STATE.ends[1].hscY = 0; STATE.ends[1].wasDouble = isD;
    return { nP, vOther: tile[1] };
  }

  const c = STATE.extremes[side];
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  const vOther = tile[0] === c ? tile[1] : tile[0];

  const e = STATE.ends[side];
  if (typeof e.dir !== 'number') e.dir = side === 0 ? 0 : 180;
  if (typeof e.lineCount !== 'number') e.lineCount = 0;
  if (typeof e.wasDouble !== 'boolean') e.wasDouble = false;
  if (typeof e.lastVDir !== 'number') e.lastVDir = side === 0 ? 90 : 270;
  // ... resto do codigo ...
  
  // (Mantendo o resto da funcao original)
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  const maxInLine = isVertFlow ? (CONFIG?.GAME?.MAX_VERT ?? 6) : (CONFIG?.GAME?.MAX_HORIZ ?? 6);

  const oldDX = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  const oldDY = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
    if (isVertFlow) {
      e.lastVDir = e.dir;
      e.dir = (side === 1 ? 0 : 180);
    } else {
      e.dir = (e.lastVDir === 90 ? 270 : 90);
    }
    e.lineCount = 0;
    isVertFlow = (e.dir === 90 || e.dir === 270);
  }
  e.lineCount++;

  const dx = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  const dy = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  const TW = CONFIG?.GAME?.TILE_W ?? 18;
  const TL = CONFIG?.GAME?.TILE_L ?? 36;

  const stepOut  = (e.wasDouble ? TW / 2 : TL / 2) + (TW / 2);
  const stepSide = (isD ? TW / 2 : TL / 2) - (TW / 2);

  const nx = e.hscX + (stepOut * oldDX) + (stepSide * dx);
  const ny = e.hscY + (stepOut * oldDY) + (stepSide * dy);

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


