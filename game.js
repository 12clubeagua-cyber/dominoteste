/* ═══════════════════════════════════════════════════════
   FLUXO DE JOGO (game.js)
═══════════════════════════════════════════════════════ */

function startRound() {
  STATE.isOver = false;
  STATE.isBlocked = false;
  STATE.passCount = 0;
  STATE.playerPassed.fill(false);
  
  const resArea = document.getElementById('result-area');
  if (resArea) resArea.style.display = 'none';

  if (STATE.autoNextInterval) {
    clearInterval(STATE.autoNextInterval);
    STATE.autoNextInterval = null;
  }

  if (netMode === 'host') {
    broadcast({ type: 'shuffle_start' });
  }

  dealAndStart();
}

function dealAndStart() {
  const s = document.getElementById('snake');
  if (s) s.innerHTML = '';

  window.minScaleReached = CONFIG.GAME.SNAKE_MAX_SCALE;
  window.currentSnakeScale = window.minScaleReached;

  const deck = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      deck.push([i, j]);
    }
  }
  deck.sort(() => Math.random() - 0.5);

  STATE.hands = [deck.splice(0,7), deck.splice(0,7), deck.splice(0,7), deck.splice(0,7)];
  STATE.handSize = [7, 7, 7, 7];
  STATE.positions = [];
  STATE.extremes = [null, null];
  STATE.ends = [
    { hscX:0, hscY:0, dir:270, lineCount:1, lastVDir:270, wasDouble:false },
    { hscX:0, hscY:0, dir:90,  lineCount:1, lastVDir:90,  wasDouble:false },
  ];

  if (STATE.roundWinner !== null) {
    STATE.current = STATE.roundWinner;
  } else {
    let starter = 0;
    STATE.hands.forEach((h, i) => {
      h.forEach(t => { if (t[0] === 6 && t[1] === 6) starter = i; });
    });
    STATE.current = starter;
  }

  STATE.isBlocked = false; 
  STATE.isShuffling = false;

  if (netMode === 'host') broadcastState(); 
  
  renderHands();
  renderBoardFromState();
  processTurn();
}

function processTurn() {
  if (STATE.isOver) return;

  const pIdx = STATE.current;
  const moves = getMoves(STATE.hands[pIdx]);

  if (moves.length === 0) {
    STATE.playerPassed[pIdx] = true;
    STATE.passCount++;
    triggerPassVisual(pIdx);
    playPass();
    
    if (netMode === 'host') {
      broadcast({ type: 'animate_pass', pIdx });
    }

    if (STATE.passCount >= 4) {
      endRound("JOGO TRANCADO!");
      return;
    }

    setTimeout(() => {
      STATE.current = (STATE.current + 1) % 4;
      processTurn();
    }, 1000);
    return;
  }

  if (pIdx === myPlayerIdx && netMode !== 'client') {
    highlight(moves);
    updateStatus("SUA VEZ", "active");
    STATE.isBlocked = false; 
  } else if (netMode !== 'client') {
    updateStatus(NAMES[pIdx] + CONFIG.BOT.THINKING_MSG);
    const delay = Math.random() * (CONFIG.BOT.MAX_DELAY - CONFIG.BOT.MIN_DELAY) + CONFIG.BOT.MIN_DELAY;
    
    setTimeout(() => {
      const choice = moves[Math.floor(Math.random() * moves.length)];
      play(pIdx, choice.idx, choice.side === 'both' ? (Math.random() > 0.5 ? 0 : 1) : (choice.side === 'any' ? 0 : choice.side));
    }, delay);
  }
}

function play(pIdx, tIdx, side) {
  if (STATE.isOver) return;
  STATE.isBlocked = true;
  
  if (netMode === 'client') {
     const picker = document.getElementById('side-picker');
     if (picker) picker.style.display = 'none';
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

  const placement = calculateTilePlacement(tile, side);
  
  if (!STATE.positions.length) {
      STATE.extremes = [tile[0], tile[1]];
  } else {
      STATE.extremes[side] = placement.vOther;
  }
  
  STATE.positions.push(placement.nP);
  try { updateSnakeScale(); } catch(err) {}
  
  if (netMode === 'host') {
    broadcast({ 
      type: 'animate_play', 
      pIdx, 
      tIdx, 
      side, 
      nP: placement.nP 
    });
  }

  // ANIMAÇÃO
  animateTile(pIdx, placement.nP, () => {
    // CORREÇÃO: Renderiza o tabuleiro fixo após o término da animação
    renderBoardFromState(); 
    
    if (STATE.hands[pIdx].length === 0) {
      endRound(NAMES[pIdx] + " BATEU!");
      return;
    }
    STATE.current = (STATE.current + 1) % 4;
    processTurn();
  });
}
