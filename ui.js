/* ═══════════════════════════════════════════════════════
   INTERFACE VISUAL (ui.js)
═══════════════════════════════════════════════════════ */

function renderBoardFromState() {
  const s = document.getElementById('snake');
  if (!s) return;
  s.innerHTML = ''; 
  
  const W = CONFIG.GAME.TILE_W;
  const L = CONFIG.GAME.TILE_L;

  STATE.positions.forEach((nP, i) => {
    const el = document.createElement('div');
    el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'}`;
    
    // Posicionamento baseado no centro (nP.x, nP.y)
    // Se for Vertical: largura é W, altura é L. Offset: (W/2, L/2)
    // Se for Horizontal: largura é L, altura é W. Offset: (L/2, W/2)
    const offsetX = nP.isV ? (W / 2) : (L / 2);
    const offsetY = nP.isV ? (L / 2) : (W / 2);

    el.style.left = (nP.x - offsetX) + 'px';
    el.style.top  = (nP.y - offsetY) + 'px';
    
    el.innerHTML = `<div class="half">${getPips(nP.v1)}</div><div class="half">${getPips(nP.v2)}</div>`;
    if (i === STATE.positions.length - 1 && !STATE.isOver) el.classList.add('last-move');
    s.appendChild(el);
  });
}

// ... (Mantenha as outras funções: updateScoreDisplay, startRoundBtn, renderHands, etc. como estavam)
