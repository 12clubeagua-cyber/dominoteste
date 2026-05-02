/* ═══════════════════════════════════════════════════════
   FLUXO DE JOGO (game.js)
═══════════════════════════════════════════════════════ */

// ── INICIA UMA NOVA RODADA (embaralha + distribui) ──────────────────────────
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

  // Limpa animações de vitória das mãos
  for (let v = 0; v < 4; v++) {
    const el = document.getElementById(`hand-${v}`);
    if (el) el.classList.remove('hand-win-blink');
  }

  if (netMode === 'host') broadcastToClients({ type: 'shuffle_start' });

  runShuffleAnimation(() => dealAndStart());
}

// ── DISTRIBUI AS PEÇAS E COMEÇA O TURNO ────────────────────────────────────
function dealAndStart() {
  const s = document.getElementById('snake');
  if (s) s.innerHTML = '';

  window.minScaleReached = CONFIG.GAME.SNAKE_MAX_SCALE;
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

  // Determina quem começa: vencedor anterior ou quem tem o [6,6]
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

  broadcastState();
  renderHands();
  renderBoardFromState();
  processTurn();
}

// ── PROCESSA O TURNO DO JOGADOR ATUAL ──────────────────────────────────────
function processTurn() {
  if (STATE.isOver) return;

  const cur = STATE.current;
  const moves = getMoves(STATE.hands[cur]);

  // É BOT (ou cliente remoto)?
  // No Host, só joga como BOT se o índice não for o dele E não for de um cliente conectado.
  let isHuman = false;
  if (netMode === 'offline') {
    isHuman = (cur === myPlayerIdx);
  } else if (netMode === 'host') {
    isHuman = (cur === myPlayerIdx || connectedClients.some(c => c.assignedIdx === cur));
  } else {
    // No cliente, apenas o próprio cliente é "humano" localmente
    isHuman = (cur === myPlayerIdx);
  }

  if (!isHuman) {
    STATE.isBlocked = true;
    const playerName = NameManager.get(cur);
    updateStatus(`${playerName} JOGANDO...`);

    if (moves.length === 0) {
      const delay = CONFIG.BOT.MIN_DELAY + Math.random() * (CONFIG.BOT.MAX_DELAY - CONFIG.BOT.MIN_DELAY);
      updateStatus(CONFIG.BOT.THINKING_MSG);
      setTimeout(() => doPass(cur), delay);
    } else {
      const delay = CONFIG.BOT.MIN_DELAY + Math.random() * (CONFIG.BOT.MAX_DELAY - CONFIG.BOT.MIN_DELAY);
      updateStatus(CONFIG.BOT.THINKING_MSG);
      setTimeout(() => {
        const move = chooseBotMove(cur, moves);
        const side = move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side);
        play(cur, move.idx, side);
      }, delay);
    }
    return;
  }

  // É O JOGADOR HUMANO LOCAL
  if (moves.length === 0) {
    STATE.isBlocked = true;
    updateStatus(`${NameManager.get(cur)} NÃO TEM PEÇA`, 'pass');
    setTimeout(() => doPass(cur), 1500);
    return;
  }

  if (netMode === 'host' && cur !== myPlayerIdx) {
    // É um cliente humano com jogadas. Host apenas aguarda o sinal.
    STATE.isBlocked = true;
    updateStatus(`${NameManager.get(cur)} JOGANDO...`);
    return;
  }

  STATE.isBlocked = false;
  updateStatus('SUA VEZ', 'active');
  renderHands();
  if (netMode === 'client' || netMode === 'offline' || (netMode === 'host' && cur === myPlayerIdx)) {
    highlight(moves);
  }
}

// ── PASSA A VEZ ────────────────────────────────────────────────────────────
function doPass(pIdx) {
  if (STATE.isOver) return;

  // Registra na memória dos bots que este jogador não tem essas pontas
  if (STATE.extremes[0] !== null) {
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[0]))
      STATE.playerMemory[pIdx].push(STATE.extremes[0]);
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[1]))
      STATE.playerMemory[pIdx].push(STATE.extremes[1]);
  }

  STATE.playerPassed[pIdx] = true;
  STATE.passCount++;

  playPass();
  triggerPassVisual(pIdx);

  if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx });

  // 4 passes seguidos = jogo trancado
  if (STATE.passCount >= 4) {
    endRound('block', -1);
    return;
  }

  STATE.current = (STATE.current + 1) % 4;
  broadcastState();

  setTimeout(() => processTurn(), CONFIG.GAME.PASS_DISPLAY_TIME);
}

// ── ENCERRA A RODADA ───────────────────────────────────────────────────────
function endRound(reason, winnerIdx) {
  if (STATE.isOver) return;
  STATE.isOver = true;
  STATE.isBlocked = true;

  let winTeam = -1;
  let msg = '';
  let detail = '';

  if (reason === 'win') {
    winTeam = (winnerIdx % 2 === 0) ? 0 : 1;
    const winnerName = NameManager.get(winnerIdx);
    STATE.scores[winTeam]++;
    STATE.roundWinner = winnerIdx;

    // Ajusta mensagem para perspectiva do jogador local
    const isMyTeam = (myPlayerIdx % 2 === winnerIdx % 2);
    msg = isMyTeam ? '🏆 SUA DUPLA VENCEU!' : '🏆 OPONENTES VENCERAM!';
    detail = `${winnerName} fechou a mão! +1 ponto`;

  } else if (reason === 'block') {
    const sumA = STATE.hands[0].reduce((s, t) => s + t[0] + t[1], 0)
               + STATE.hands[2].reduce((s, t) => s + t[0] + t[1], 0);
    const sumB = STATE.hands[1].reduce((s, t) => s + t[0] + t[1], 0)
               + STATE.hands[3].reduce((s, t) => s + t[0] + t[1], 0);

    detail = `Equipe A: ${sumA} pts · Equipe B: ${sumB} pts`;

    if (sumA < sumB) {
      winTeam = 0; STATE.scores[0]++; STATE.roundWinner = 0;
    } else if (sumB < sumA) {
      winTeam = 1; STATE.scores[1]++; STATE.roundWinner = 1;
    } else {
      // Empate: quem colocou a última peça inicia a próxima rodada
      winTeam = -1;
      STATE.roundWinner = STATE.lastPlayed !== null ? STATE.lastPlayed : null;
    }

    if (winTeam !== -1) {
      const isMyTeam = (myPlayerIdx % 2 === winTeam);
      msg = `JOGO TRANCADO! (${sumA}x${sumB})\n${isMyTeam ? 'Sua dupla vence' : 'Oponentes vencem'}`;
    } else {
      const starterName = STATE.roundWinner !== null ? NameManager.get(STATE.roundWinner) : '?';
      msg = `JOGO TRANCADO! (${sumA}x${sumB})\nEmpate — ${starterName} começa`;
    }
  }

  const resDetail = document.getElementById('res-detail');
  if (resDetail) resDetail.textContent = detail;

  if (netMode === 'host') {
    broadcastToClients({ type: 'end_round', winTeam, idx: winnerIdx, msg });
    broadcastState();
  }

  executeEndRoundUI(winTeam, winnerIdx, msg);
}

// ── JOGADA ─────────────────────────────────────────────────────────────────
function play(pIdx, tIdx, side) {
  if (STATE.isOver) return;

  // Validação: Verificar se o jogador é o atual e se tIdx existe
  if (STATE.current !== pIdx || !STATE.hands[pIdx][tIdx]) {
      console.warn("Jogada inválida ignorada:", pIdx, tIdx);
      return;
  }

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
  STATE.lastPlayed = pIdx; // Registra quem jogou a última peça

  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands();

  const normalizedSide = (side === 'any') ? 0 : side;
  const placement = calculateTilePlacement(tile, normalizedSide);

  if (!STATE.positions.length) {
    if (tile[0] === tile[1]) {
      STATE.extremes = [tile[0], tile[0]];
    } else {
      STATE.extremes = [tile[0], tile[1]];
    }
  } else {
    STATE.extremes[normalizedSide] = placement.vOther;
  }

  STATE.positions.push(placement.nP);
  try { updateSnakeScale(); } catch (err) {}

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
