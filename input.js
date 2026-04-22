/* ═══════════════════════════════════════════════════════
   CONTROLE DE ENTRADA DO USUÁRIO (input.js)
═══════════════════════════════════════════════════════ */

function highlight(moves) {
  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      safeAudioInit();
      if (STATE.isBlocked) return;
      
      // Se tiver dois lados para jogar e não for a última peça
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

function cancelMove() {
  document.getElementById('side-picker').style.display = 'none';
  STATE.isBlocked = false;
}

function executeMove(s) {
  document.getElementById('side-picker').style.display = 'none';
  STATE.isBlocked = false;
  play(myPlayerIdx, STATE.pendingIdx, s);
}

// Sensor de redimensionamento de mesa
window.addEventListener('resize', () => {
  if (STATE.positions && STATE.positions.length > 0) {
    updateSnakeScale();
    renderBoardFromState();
  }
});
