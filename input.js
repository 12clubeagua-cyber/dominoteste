/* ═══════════════════════════════════════════════════════
   CONTROLE DE ENTRADA DO USUÁRIO (input.js)
═══════════════════════════════════════════════════════ */

// Sensor de redimensionamento de mesa
const handleResize = () => {
  if (STATE.positions && STATE.positions.length > 0) {
    updateSnakeScale();
    renderBoardFromState();
  }
};
window.addEventListener('resize', handleResize);

function removePlayableListeners() {
    STATE.hands[myPlayerIdx].forEach((_, idx) => {
        const el = document.getElementById(`my-tile-${idx}`);
        if (el) {
            el.classList.remove('playable');
            el.onclick = null;
        }
    });
}

function highlight(moves) {
  // Limpa ouvintes antigos primeiro
  removePlayableListeners();

  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      safeAudioInit();
      if (STATE.isBlocked) return;
      
      removePlayableListeners(); // Remove assim que clica

      if (x.side === 'both' && STATE.extremes[0] !== STATE.extremes[1] && STATE.hands[myPlayerIdx].length > 1) {
        STATE.pendingIdx = x.idx;
        document.getElementById('side-picker').style.display = 'flex';
        STATE.isBlocked = true;
      } else {
        STATE.isBlocked = true;
        play(myPlayerIdx, x.idx, x.side === 'both' || x.side === 'any' ? 1 : x.side);
      }
    };
  });
}

function executeMove(side) {
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  if (STATE.pendingIdx !== null) {
    const idx = STATE.pendingIdx;
    STATE.pendingIdx = null;
    play(myPlayerIdx, idx, side);
  }
}

function cancelMove() {
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';
  STATE.pendingIdx = null;
  STATE.isBlocked = false;
  
  // Re-habilita a seleção das peças
  const moves = getMoves(STATE.hands[myPlayerIdx]);
  if (moves.length > 0) highlight(moves);
}

