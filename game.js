/* ═══════════════════════════════════════════════════════
   FLUXO DE JOGO (game.js)
═══════════════════════════════════════════════════════ */

function dealAndStart() {
  const s = document.getElementById('snake');
  if (s) s.innerHTML = '';

  window.minScaleReached = CONFIG.GAME.SNAKE_MAX_SCALE;
  window.currentSnakeScale = window.minScaleReached;

  const deck = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) deck.push([i, j]);
  deck.sort(() => Math.random() - .5);

  STATE.hands = [deck.splice(0,7), deck.splice(0,7), deck.splice(0,7), deck.splice(0,7)];
  STATE.handSize = [7, 7, 7, 7];
  STATE.positions = [];
  STATE.extremes = [null, null];
  STATE.ends = [
    { hscX:0, hscY:0, dir:270, lineCount:1, lastVDir:270, wasDouble:false },
    { hscX:0, hscY:0, dir:90,  lineCount:1, lastVDir:90,  wasDouble:false },
  ];

  if (STATE.roundWinner !== null) STATE.current = STATE.roundWinner;
  else STATE.hands.forEach((h, i) => h.forEach(t => { if (t[0]===6 && t[1]===6) STATE.current = i; }));

  STATE.isBlocked = false; 
  STATE.isShuffling = false;

  broadcastState(); 
  renderHands();
  renderBoardFromState();
  processTurn();
}

function play(pIdx, tIdx, side) {
  if (STATE.isOver) return;
  
  if (netMode === 'client') {
     const picker = document.getElementById('side-picker');
     if (picker) picker.style.display = 'none';
     STATE.isBlocked = true; 
     client_predicted = true;
     STATE.hands[pIdx].splice(tIdx, 1);
     STATE.handSize[pIdx]--;
     renderHands(); 
     myConnToHost.send({ type: 'play_request', tIdx, side });
     return; 
  }

  STATE.playerPassed.fill(false);
  STATE.passCount = 0; 

  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands(); 

  // MATEMÁTICA: Pega o posicionamento corrigido
  const placement = calculateTilePlacement(tile, side === 'any' ? 0 : side);
  
  if (!STATE.positions.length) {
      STATE.extremes = [tile[0], tile[1]];
  } else {
      STATE.extremes[side] = placement.vOther;
  }
  
  STATE.positions.push(placement.nP);
  try { updateSnakeScale(); } catch(err) {}
  
  if (netMode === 'host') broadcastToClients({ type: 'animate_play', pIdx, nP: placement.nP, tIdx });

  animateTile(pIdx, placement.nP, () => {
    renderBoardFromState();
    broadcastState(); 
    if (STATE.hands[pIdx].length === 0) {
      STATE.roundWinner = pIdx;
      endRound('win', pIdx);
    } else {
      STATE.current = (STATE.current + 1) % 4;
      broadcastState();
      processTurn();
    }
  });
}
