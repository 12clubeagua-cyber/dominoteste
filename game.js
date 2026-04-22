/* ═══════════════════════════════════════════════════════
   FLUXO E REGRAS DE NEGÓCIO (game.js)
═══════════════════════════════════════════════════════ */

function startRound() {
  if (netMode === 'client' || STATE.isShuffling) return; 
  if (!STATE.isOver && STATE.hands.length > 0) return; 

  STATE.isShuffling = true;
  safeAudioInit();
  if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);

  STATE.isOver = false;
  STATE.isBlocked = true;
  STATE.passCount = 0;
  STATE.playerPassed.fill(false);
  window.visualPass.fill(false);
  STATE.playerMemory = [[], [], [], []];
  STATE.handSize = [7, 7, 7, 7];

  const resArea = document.getElementById('result-area');
  if (resArea) resArea.style.display = 'none';
  
  broadcastState(); 
  updateStatus('EMBARALHANDO...', '');

  if (netMode === 'host') broadcastToClients({ type: 'shuffle_start' });
  runShuffleAnimation(() => dealAndStart());
}

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

function processTurn() {
  if (STATE.isOver) return;
  const moves = getMoves(STATE.hands[STATE.current]);

  if (!STATE.positions.length && STATE.roundWinner === null) {
    if (netMode !== 'client') {
      STATE.isBlocked = true;
      updateStatus(`${NAMES[STATE.current]} SAINDO...`);
      setTimeout(() => play(STATE.current, moves[0].idx, 1), CONFIG.GAME.START_DELAY);
    }
    return;
  }

  if (!moves.length) {
    if (netMode !== 'client') {
      STATE.passCount++;
      STATE.playerPassed[STATE.current] = true;
      
      STATE.extremes.forEach(ex => {
         if (ex !== null && !STATE.playerMemory[STATE.current].includes(ex)) {
             STATE.playerMemory[STATE.current].push(ex);
         }
      });

      const passedIdx = STATE.current;
      if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx: passedIdx });
      
      playPass(); 
      triggerPassVisual(passedIdx);
      updateStatus(`✕ ${NAMES[passedIdx]} PASSOU`, 'pass');
      
      if (STATE.passCount >= 4) { setTimeout(() => endRound('blocked'), 2000); return; }
      
      setTimeout(() => {
          STATE.current = (STATE.current + 1) % 4;
          broadcastState();
          processTurn();
      }, 1000);
    }
    return;
  }

  if (STATE.current === myPlayerIdx) {
    STATE.isBlocked = false;
    updateStatus('SUA VEZ!', 'active');
    renderHands(); 
    return;
  }

  if (netMode !== 'client') {
     const isHumanClientTurn = connectedClients.some(c => c.assignedIdx === STATE.current);
     if (isHumanClientTurn) {
         STATE.isBlocked = false; 
         updateStatus(`VEZ DE ${NAMES[STATE.current]}...`);
     } else {
         STATE.isBlocked = true; 
         updateStatus(`${NAMES[STATE.current]}${CONFIG.BOT.THINKING_MSG}`);
         setTimeout(() => {
           const best = chooseBotMove(STATE.current, moves);
           play(STATE.current, best.idx, best.side === 'both' || best.side === 'any' ? 0 : best.side);
         }, CONFIG.BOT.MIN_DELAY + Math.random() * 400);
     }
  }
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

  // CORREÇÃO: Reseta o contador de passes sempre que alguém joga
  STATE.playerPassed.fill(false);
  STATE.passCount = 0; 

  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands(); 

  const placement = calculateTilePlacement(tile, side);
  STATE.extremes[side] = placement.vOther;
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

function endRound(type, idx) {
  if (netMode === 'client' || STATE.isOver) return;
  STATE.isOver = true;
  const ptA = STATE.hands[0].concat(STATE.hands[2]).reduce((s, t) => s + t[0] + t[1], 0);
  const ptB = STATE.hands[1].concat(STATE.hands[3]).reduce((s, t) => s + t[0] + t[1], 0);
  
  let winTeam = -1;
  let msg = "";
  
  if (type === 'win') {
    winTeam = idx % 2 === 0 ? 0 : 1;
    msg = winTeam === 0 ? `EQUIPE A BATEU!` : `EQUIPE B BATEU!`;
  } else {
    if (ptA < ptB) winTeam = 0; else if (ptB < ptA) winTeam = 1;
    if (winTeam === -1) msg = `EMPATE NO TRANCO!\n(${ptA} vs ${ptB} pts)`;
    else msg = `TRANCADO: EQUIPE ${winTeam === 0 ? 'A' : 'B'} VENCEU\n(${ptA} vs ${ptB} pts)`;
    STATE.roundWinner = winTeam === -1 ? null : winTeam;
  }
  
  if (winTeam !== -1) STATE.scores[winTeam]++;
  broadcastState(); 
  if (netMode === 'host') broadcastToClients({ type: 'end_round', winTeam, idx, msg });
  executeEndRoundUI(winTeam, idx, msg); 
}
