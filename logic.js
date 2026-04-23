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

  // Primeira peça do jogo
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
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  const maxInLine = isVertFlow ? CONFIG.GAME.MAX_VERT : CONFIG.GAME.MAX_HORIZ;

  // Detecta mudança de direção (curva)
  let dirChanged = false;
  if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
    if (isVertFlow) {
      e.lastVDir = e.dir;
      e.dir = (side === 1 ? 0 : 180);
    } else {
      e.dir = (e.lastVDir === 90 ? 270 : 90);
    }
    // Reset para 0: o incremento abaixo sobe para 1,
    // garantindo que MAX_HORIZ=2 exija realmente 2 peças horizontais
    // antes de voltar ao vertical.
    e.lineCount = 0;
    dirChanged = true;
    isVertFlow = (e.dir === 90 || e.dir === 270);
  }
  e.lineCount++;

  const dx = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  const dy = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  const TW = CONFIG.GAME.TILE_W; // 18 — lado curto
  const TL = CONFIG.GAME.TILE_L; // 36 — lado longo

  /*
   * step = halfPrev + halfNew
   *
   * Na CURVA (dirChanged=true):
   *   A peça anterior estava perpendicular ao novo movimento,
   *   portanto contribui apenas com TW/2 (seu lado curto).
   *   Isso vale tanto na virada vert→horiz quanto horiz→vert.
   *
   * No RETO (dirChanged=false):
   *   Ambas as peças estão paralelas ao movimento.
   *   Dupla é quadrada (TW×TW), normal é comprida (TL).
   */
  let halfPrev, halfNew;

  if (dirChanged) {
    halfPrev = TW / 2;                  // peça anterior perpendicular
    halfNew  = isD ? TW / 2 : TL / 2;  // nova peça na nova direção
  } else {
    halfPrev = e.wasDouble ? TW / 2 : TL / 2;
    halfNew  = isD         ? TW / 2 : TL / 2;
  }

  const step = halfPrev + halfNew;

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
