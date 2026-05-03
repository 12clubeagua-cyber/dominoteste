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
  // Limpa agressivamente qualquer destaque persistente na tela inteira
  document.querySelectorAll('.tile').forEach(el => el.classList.remove('playable'));
  removePlayableListeners();

  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      safeAudioInit();
      if (STATE.isBlocked) return;
      
      removePlayableListeners(); // Remove assim que clica

      // BUG CORRIGIDO: Se as duas extremidades são iguais, a peça encaixa igual
      // dos dois lados — não precisa mostrar o picker. Só mostra quando as
      // pontas são diferentes E a peça realmente pode ir nos dois lados.
      const extremesAreDifferent = STATE.extremes[0] !== STATE.extremes[1];
      const needsPicker = x.side === 'both' && extremesAreDifferent && STATE.positions.length > 0;

      if (needsPicker) {
        STATE.pendingIdx = x.idx;
        document.getElementById('side-picker').style.display = 'flex';
        STATE.isBlocked = true;
      } else {
        STATE.isBlocked = true;
        // Para 'both' sem picker e 'any', usa lado 0 (padrão)
        const side = (x.side === 'both' || x.side === 'any') ? 0 : x.side;
        play(myPlayerIdx, x.idx, side);
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
