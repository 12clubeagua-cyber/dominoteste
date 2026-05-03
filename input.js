/* 
   CONTROLE DE ENTRADA DO USUARIO (input.js)
 */

// Sensor de redimensionamento de mesa
const handleResize = () => {
  if (STATE?.positions?.length > 0) {
    updateSnakeScale();
    renderBoardFromState();
  }
};
window.addEventListener('resize', handleResize);

function removePlayableListeners() {
    const hand = STATE?.hands?.[myPlayerIdx];
    if (!Array.isArray(hand)) return;

    hand.forEach((_, idx) => {
        const el = document.getElementById(`my-tile-${idx}`);
        if (el) {
            el.classList.remove('playable');
            el.onclick = null;
        }
    });
}

function highlight(moves) {
  document.querySelectorAll('.tile').forEach(el => el.classList.remove('playable'));
  removePlayableListeners();

  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      if (typeof safeAudioInit === 'function') safeAudioInit();
      if (STATE.isBlocked) return;

      STATE.isBlocked = true;

      // Remove o visual de "vez" e highlights imediatamente de TODOS os tiles
      document.querySelectorAll('.tile.playable').forEach(tile => tile.classList.remove('playable'));
      const hand0 = document.getElementById('hand-0');
      if (hand0) hand0.classList.remove('active-turn');

      // Remove listeners e garante limpeza visual
      removePlayableListeners();

      // Força atualização visual
      void document.body.offsetHeight; 

      // Processa a jogada
      requestAnimationFrame(() => {
          const extremesAreDifferent = STATE?.extremes?.[0] !== STATE?.extremes?.[1];
          const needsPicker = x.side === 'both' && extremesAreDifferent && STATE.positions?.length > 0;

          // Esconde qualquer picker anterior antes de decidir
          const picker = document.getElementById('side-picker');
          if (picker) picker.style.display = 'none';

          if (needsPicker) {
            STATE.pendingIdx = x.idx;
            if (picker) {
                picker.style.display = 'flex';
            }
          } else {
            const side = (x.side === 'both' || x.side === 'any') ? 0 : x.side;
            play(myPlayerIdx, x.idx, side);
          }
      });
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
  
  const hand = STATE?.hands?.[myPlayerIdx];
  if (Array.isArray(hand)) {
    const moves = getMoves(hand);
    if (moves.length > 0) highlight(moves);
  }
}


