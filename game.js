/* ═══════════════════════════════════════════════════════
   LÓGICA E REGRAS DO JOGO (game.js)
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
  processTurn();
}

function processTurn() {
  if (STATE.isOver) return;
  const moves = getMoves(STATE.hands[STATE.current]);

  if (!STATE.positions.length && STATE.roundWinner === null) {
    if (netMode !== 'client') {
      STATE.isBlocked = true;
      updateStatus(`${NAMES[STATE.current]} SAINDO COM O 6|6...`);
      setTimeout(() => play(STATE.current, moves[0].idx, 1), 1200);
    }
    return;
  }

  if (!moves.length) {
    if (netMode !== 'client') {
      STATE.passCount++;
      STATE.playerPassed[STATE.current] = true;
      const passedIdx = STATE.current;
      if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx: passedIdx });
      playPass(); // Som de passar local
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
         updateStatus(`${NAMES[STATE.current]} PENSANDO...`);
         setTimeout(() => {
           const best = chooseBotMove(STATE.current, moves);
           play(STATE.current, best.idx, best.side === 'both' || best.side === 'any' ? 0 : best.side);
         }, 900 + Math.random() * 400);
     }
  }
}

function play(pIdx, tIdx, side) {
  if (STATE.isOver) return;
  if (netMode === 'client') {
     document.getElementById('side-picker').style.display = 'none';
     STATE.isBlocked = true; 
     client_predicted = true;
     STATE.hands[pIdx].splice(tIdx, 1);
     STATE.handSize[pIdx]--;
     renderHands(); 
     myConnToHost.send({ type: 'play_request', tIdx, side });
     return; 
  }

  STATE.playerPassed.fill(false);
  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands(); 

  const isD = tile[0] === tile[1];
  let nP = {};
  if (!STATE.positions.length) {
    STATE.extremes = [tile[0], tile[1]];
    nP = { x:0, y:0, v1:tile[0], v2:tile[1], isV:!isD };
    STATE.ends[0] = isD ? {hscX:0, hscY:0, dir:270, lineCount:1, lastVDir:270, wasDouble:true} : {hscX:0, hscY:-9, dir:270, lineCount:1, lastVDir:270, wasDouble:false};
    STATE.ends[1] = isD ? {hscX:0, hscY:0, dir:90, lineCount:1, lastVDir:90, wasDouble:true} : {hscX:0, hscY:9, dir:90, lineCount:1, lastVDir:90, wasDouble:false};
  } else {
    const c = STATE.extremes[side];
    const vMatch = tile[0] === c ? tile[0] : tile[1];
    const vOther = tile[0] === c ? tile[1] : tile[0];
    STATE.extremes[side] = vOther;
    const e = STATE.ends[side];
    let isVertFlow = (e.dir === 90 || e.dir === 270);
    if (e.lineCount >= (isVertFlow ? 6 : 2) && !isD && !e.wasDouble) {
      if (isVertFlow) { e.lastVDir = e.dir; e.dir = side === 1 ? 0 : 180; }
      else { e.dir = e.lastVDir === 90 ? 270 : 90; }
      e.lineCount = 1;
      isVertFlow = (e.dir === 90 || e.dir === 270);
    }
    e.lineCount++;
    const dx = e.dir===0?1 : e.dir===180?-1 : 0;
    const dy = e.dir===90?1 : e.dir===270?-1 : 0;
    const chX = e.hscX + 18*dx, chY = e.hscY + 18*dy;
    let cx, cy, newHscX, newHscY;
    if (isD) { cx = chX; cy = chY; newHscX = chX; newHscY = chY; } 
    else { cx = (chX + (chX + 18*dx))/2; cy = (chY + (chY + 18*dy))/2; newHscX = chX + 18*dx; newHscY = chY + 18*dy; }
    nP = { x:cx, y:cy, v1:(e.dir===180||e.dir===270)?vOther:vMatch, v2:(e.dir===180||e.dir===270)?vMatch:vOther, isV:isVertFlow ? !isD : isD };
    e.hscX = newHscX; e.hscY = newHscY; e.wasDouble = isD;
  }

  STATE.positions.push(nP);
  try { updateSnakeScale(); } catch(err) {}
  if (netMode === 'host') broadcastToClients({ type: 'animate_play', pIdx, nP, tIdx });
  animateTile(pIdx, nP, () => {
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
    msg = winTeam === -1 ? `EMPATE NO TRANCO!` : `TRANCADO: EQUIPE ${winTeam === 0 ? 'A' : 'B'} VENCEU`;
    STATE.roundWinner = winTeam === -1 ? null : winTeam;
  }
  if (winTeam !== -1) STATE.scores[winTeam]++;
  broadcastState(); 
  if (netMode === 'host') broadcastToClients({ type: 'end_round', winTeam, idx, msg });
  executeEndRoundUI(winTeam, idx, msg); 
}
