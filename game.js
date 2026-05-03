/* 
   FLUXO DE JOGO (game.js)
 */

let turnRetryCount = 0;
const MAX_TURN_RETRIES = 10;

function startRound() {
  STATE.isOver = false;
  STATE.isBlocked = true;
  STATE.isShuffling = true;
  STATE.playerMemory = [[], [], [], []];
  STATE.passCount = 0;
  STATE.playerPassed = [false, false, false, false];
  STATE.lastPlayed = null;

  const resArea = document.getElementById('result-area');
  if (resArea) resArea.style.display = 'none';

  for (let v = 0; v < 4; v++) {
    const el = document.getElementById(`hand-${v}`);
    if (el) el.classList.remove('hand-win-blink');
  }

  if (netMode === 'host') broadcastToClients({ type: 'shuffle_start' });

  runShuffleAnimation(() => dealAndStart());
}

function dealAndStart() {
  const s = document.getElementById('snake');
  if (s) s.innerHTML = '';

  window.minScaleReached = CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3;
  window.currentSnakeScale = window.minScaleReached;

  const deck = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) deck.push([i, j]);
  deck.sort(() => Math.random() - .5);

  STATE.hands = [deck.splice(0, 7), deck.splice(0, 7), deck.splice(0, 7), deck.splice(0, 7)];
  STATE.handSize = [7, 7, 7, 7];
  STATE.positions = [];
  STATE.extremes = [null, null];
  STATE.ends = [
    { hscX: 0, hscY: 0, dir: 270, lineCount: 1, lastVDir: 270, wasDouble: false },
    { hscX: 0, hscY: 0, dir: 90,  lineCount: 1, lastVDir: 90,  wasDouble: false },
  ];

  if (STATE.roundWinner !== null) {
    STATE.current = STATE.roundWinner;
  } else {
    STATE.current = 0;
    STATE.hands.forEach((h, i) => h.forEach(t => {
      if (t[0] === 6 && t[1] === 6) STATE.current = i;
    }));
  }

  STATE.isOver = false;
  STATE.isBlocked = false;
  STATE.isShuffling = false;

  if (netMode === 'host') broadcastState();
  
  renderHands();
  renderBoardFromState();
  
  setTimeout(() => processTurn(), CONFIG?.GAME?.START_DELAY ?? 1200);
}

function processTurn() {
  if (STATE.isOver) return;

  // Garante que o estado seja desbloqueado no inicio do turno
  STATE.isBlocked = false;

  const cur = STATE.current;

  if (!STATE.hands[cur]) {
    turnRetryCount++;
    if (turnRetryCount >= MAX_TURN_RETRIES) {
        STATE.hands[cur] = [];
        turnRetryCount = 0;
    }
    setTimeout(processTurn, 500);
    return;
  }
  turnRetryCount = 0;


  const moves = getMoves(STATE.hands[cur]);
  let isHuman = false;
  if (netMode === 'offline') {
    isHuman = (cur === myPlayerIdx);
  } else if (netMode === 'host') {
    isHuman = (cur === myPlayerIdx || connectedClients.some(c => c.assignedIdx === cur));
  } else if (netMode === 'client') {
    if (cur !== myPlayerIdx) {
      STATE.isBlocked = true;
      updateStatus(`${NameManager.get(cur)} JOGANDO...`);
      return;
    }
    isHuman = true;
  }

  if (!isHuman) {
    STATE.isBlocked = true;
    const playerName = NameManager.get(cur);
    updateStatus(`${playerName} JOGANDO...`);

    const delay = (CONFIG?.BOT?.MIN_DELAY ?? 500) + Math.random() * ((CONFIG?.BOT?.MAX_DELAY ?? 1500) - (CONFIG?.BOT?.MIN_DELAY ?? 500));
    updateStatus(CONFIG?.BOT?.THINKING_MSG ?? "PENSANDO...");
    clearTurnTimer();
    STATE.turnTimer = setTimeout(() => {
        if (moves.length === 0) doPass(cur);
        else {
            const move = chooseBotMove(cur, moves);
            if (!move) doPass(cur);
            else play(cur, move.idx, move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side));
        }
    }, delay);
    return;
  }

  if (moves.length === 0) {
    STATE.isBlocked = true;
    updateStatus(`${NameManager.get(cur)} NAO TEM PECA`, 'pass');
    clearTurnTimer();
    STATE.turnTimer = setTimeout(() => doPass(cur), 1500);
    return;
  }

  if (netMode === 'host' && cur !== myPlayerIdx) {
    STATE.isBlocked = true;
    updateStatus(`${NameManager.get(cur)} JOGANDO...`);
    return;
  }

  STATE.isBlocked = false;
  updateStatus('SUA VEZ', 'active');
  renderHands();
  if (netMode === 'client' || netMode === 'offline' || (netMode === 'host' && cur === myPlayerIdx)) highlight(moves);
}

function doPass(pIdx) {
  if (STATE.isOver) return;

  if (STATE.extremes[0] !== null) {
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[0])) STATE.playerMemory[pIdx].push(STATE.extremes[0]);
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[1])) STATE.playerMemory[pIdx].push(STATE.extremes[1]);
  }

  STATE.playerPassed[pIdx] = true;
  STATE.passCount++;

  playPass();
  triggerPassVisual(pIdx);

  if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx });

  if (STATE.passCount >= 4) {
    endRound('block', -1);
    return;
  }

  STATE.current = (STATE.current + 1) % 4;
  broadcastState();

  clearTurnTimer();
  STATE.turnTimer = setTimeout(() => processTurn(), CONFIG?.GAME?.PASS_DISPLAY_TIME ?? 1500);
}

function endRound(reason, winnerIdx) {
  if (STATE.isOver) return;
  STATE.isOver = true;
  STATE.isBlocked = true;

  let winTeam = -1, msg = '', detail = '';

  if (reason === 'win') {
    winTeam = (winnerIdx % 2 === 0) ? 0 : 1;
    STATE.scores[winTeam]++;
    STATE.roundWinner = winnerIdx;
    msg = (myPlayerIdx % 2 === winnerIdx % 2) ? ' SUA DUPLA VENCEU!' : ' OPONENTES VENCERAM!';
    detail = `${NameManager.get(winnerIdx)} fechou a mao! +1 ponto`;
  } else if (reason === 'block') {
    const sumA = STATE.hands[0].reduce((s, t) => s + t[0] + t[1], 0) + STATE.hands[2].reduce((s, t) => s + t[0] + t[1], 0);
    const sumB = STATE.hands[1].reduce((s, t) => s + t[0] + t[1], 0) + STATE.hands[3].reduce((s, t) => s + t[0] + t[1], 0);
    detail = `Equipe A: ${sumA} pts  Equipe B: ${sumB} pts`;
    if (sumA < sumB) { winTeam = 0; STATE.scores[0]++; STATE.roundWinner = 0; }
    else if (sumB < sumA) { winTeam = 1; STATE.scores[1]++; STATE.roundWinner = 1; }
    else { winTeam = -1; STATE.roundWinner = STATE.lastPlayed ?? null; }
    msg = `JOGO trancado! (${sumA}x${sumB})`;
  }

  const resDetail = document.getElementById('res-detail');
  if (resDetail) resDetail.textContent = detail;

  if (netMode === 'host') {
    const safeHands = STATE.hands.map(h => Array.isArray(h) ? h : []);
    broadcastToClients({ type: 'end_round', winTeam, idx: winnerIdx, msg, hands: safeHands });
    broadcastState();
  }

  executeEndRoundUI(winTeam, winnerIdx, msg);
}

function play(pIdx, tIdx, side) {
  if (STATE.isOver) return;

  const hand = STATE?.hands?.[pIdx];
  if (STATE.current !== pIdx || !Array.isArray(hand) || !hand[tIdx]) {
      console.warn("jogada invalida ignorada:", pIdx, tIdx);
      return;
  }

  if (netMode === 'client') {
    if (pIdx !== myPlayerIdx || !myConnToHost || !myConnToHost.open) return;
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

  STATE.playerPassed.fill(false); STATE.passCount = 0;
  STATE.lastPlayed = pIdx;

  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands();

  const normalizedSide = (side === 'any') ? 0 : side;
  const placement = calculateTilePlacement(tile, normalizedSide);

  if (!STATE.positions.length) STATE.extremes = (tile[0] === tile[1]) ? [tile[0], tile[0]] : [tile[0], tile[1]];
  else STATE.extremes[normalizedSide] = placement.vOther;

  STATE.positions.push(placement.nP);
  try { updateSnakeScale(); } catch (err) { console.error(err); }

  if (netMode === 'host') broadcastToClients({ type: 'animate_play', pIdx, nP: placement.nP, tIdx });

  animateTile(pIdx, placement.nP, () => {
    STATE.isBlocked = false;
    renderBoardFromState();
    if (typeof broadcastState === 'function') broadcastState();
    if (STATE.hands[pIdx].length === 0) {
      STATE.roundWinner = pIdx;
      endRound('win', pIdx);
    } else {
      STATE.current = (STATE.current + 1) % 4;
      if (typeof broadcastState === 'function') broadcastState();
      if (typeof processTurn === 'function') processTurn();
    }
  });
}


