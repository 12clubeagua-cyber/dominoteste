/* ═══════════════════════════════════════════════════════
   ESTADO GLOBAL E REDE
═══════════════════════════════════════════════════════ */
let STATE = {
  hands: [],
  extremes: [null, null],
  current: 0,
  scores: [0, 0],
  pendingIdx: null,
  isBlocked: false,
  isOver: false,
  roundWinner: null,
  positions: [],
  passCount: 0,
  playerPassed: [false, false, false, false],
  ends: [],
  playerMemory: [[], [], [], []],
  handSize: [7, 7, 7, 7],
  targetScore: 1,
  difficulty: 'normal',
};

const NAMES = ["JOGADOR 1", "JOGADOR 2", "JOGADOR 3", "JOGADOR 4"];
let audioCtx = null;

let netMode = 'offline'; 
let myPlayerIdx = 0; 
let myPeer = null;
let myConnToHost = null; 
let connectedClients = []; 
let client_predicted = false;

window.visualPass = [false, false, false, false];

/* ═══════════════════════════════════════════════════════
   GERENCIAMENTO DE TELAS DO LOBBY
═══════════════════════════════════════════════════════ */
function hideAllSteps() {
  document.querySelectorAll('.start-step').forEach(el => el.classList.remove('active'));
}

function goToStep(stepId) {
  hideAllSteps();
  document.getElementById(stepId).classList.add('active');
}

function selectMode(mode) {
  netMode = mode;
  if (mode === 'offline' || mode === 'host') {
    goToStep('step-diff');
  } else if (mode === 'client') {
    goToStep('step-lobby-client');
  }
}

function selectDiff(diff) {
  STATE.difficulty = diff;
  document.getElementById('btn-easy').classList.remove('selected');
  document.getElementById('btn-normal').classList.remove('selected');
  document.getElementById('btn-hard').classList.remove('selected');
  document.getElementById(`btn-${diff}`).classList.add('selected');
  goToStep('step-goal');
}

function selectGoal(limit) {
  STATE.targetScore = limit;
  if (netMode === 'offline') {
    startMatch();
  } else if (netMode === 'host') {
    goToStep('step-lobby-host');
    initializeHost();
  }
}

/* ═══════════════════════════════════════════════════════
   LÓGICA PEERJS: HOST E CLIENT
═══════════════════════════════════════════════════════ */
function generateShortID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'DOMINO-' + result;
}

function initializeHost() {
  if (myPeer) myPeer.destroy();
  const roomCode = generateShortID();
  document.getElementById('host-code-display').innerText = roomCode.split('-')[1];
  
  myPeer = new Peer(roomCode);
  
  myPeer.on('open', (id) => {
    document.getElementById('btn-start-multi').style.display = 'flex';
  });

  myPeer.on('connection', (conn) => {
    if (connectedClients.length >= 3) {
      conn.send({ type: 'error', msg: 'Sala cheia!' });
      setTimeout(() => conn.close(), 500);
      return;
    }

    conn.on('open', () => {
      connectedClients.push(conn);
      updateHostLobbyUI();
      conn.send({ type: 'welcome', msg: 'Conectado! Aguarde o host iniciar.' });
    });

    conn.on('data', (data) => {
      if (data.type === 'play_request' && !STATE.isBlocked) {
        if (STATE.current === conn.assignedIdx) {
          play(conn.assignedIdx, data.tIdx, data.side);
        }
      }
      if (data.type === 'next_round_request') {
         if (STATE.isOver) startRound();
      }
    });

    conn.on('close', () => {
      connectedClients = connectedClients.filter(c => c.peer !== conn.peer);
      updateHostLobbyUI();
    });
  });
}

function updateHostLobbyUI() {
  const count = connectedClients.length;
  document.getElementById('host-status').innerText = `Jogadores conectados: ${count}/3`;
  const list = document.getElementById('host-player-list');
  list.innerHTML = '<div class="player-item">Você (Host)</div>';
  connectedClients.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerText = `Jogador conectado`;
    list.appendChild(el);
  });
}

function cancelHosting() {
  if (myPeer) { myPeer.destroy(); myPeer = null; }
  connectedClients = [];
  goToStep('step-mode');
}

function broadcastToClients(payload) {
  connectedClients.forEach(c => c.send(payload));
}

function broadcastState() {
  if (netMode !== 'host') return;
  broadcastToClients({ type: 'sync_state', state: STATE });
}

function connectToHost() {
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  if (input.length < 5) {
    document.getElementById('client-status').innerText = "Código inválido!";
    return;
  }

  document.getElementById('client-status').innerText = "Conectando...";
  document.getElementById('btn-connect').disabled = true;

  if (myPeer) myPeer.destroy();
  myPeer = new Peer(); 
  
  myPeer.on('open', (id) => {
    const targetRoom = 'DOMINO-' + input;
    myConnToHost = myPeer.connect(targetRoom);

    myConnToHost.on('open', () => {
      document.getElementById('client-status').innerText = "Conectado! Aguardando Host iniciar...";
    });

    myConnToHost.on('data', (data) => {
      if (data.type === 'game_start') {
        myPlayerIdx = data.yourIdx;
        document.getElementById('start-screen').style.display = 'none';
        updateScoreDisplay(); 
      }
      
      if (data.type === 'shuffle_start') {
          runShuffleAnimation();
      }

      if (data.type === 'sync_state') {
        STATE = data.state;
        updateScoreDisplay();
        renderBoardFromState(); 
        renderHands(STATE.isOver); 
        updateSnakeScale();
      }

      if (data.type === 'animate_play') {
         if (data.pIdx === myPlayerIdx && !client_predicted) {
            STATE.hands[data.pIdx].splice(data.tIdx, 1);
            STATE.handSize[data.pIdx]--;
            renderHands();
         } else if (data.pIdx !== myPlayerIdx) {
            STATE.hands[data.pIdx].pop(); 
            STATE.handSize[data.pIdx]--;
            renderHands();
         }
         client_predicted = false;
         animateTile(data.pIdx, data.nP, () => {});
      }

      if (data.type === 'status') {
         updateStatusLocal(data.text, data.cls);
      }

      if (data.type === 'animate_pass') {
         triggerPassVisual(data.pIdx);
      }

      if (data.type === 'end_round') {
         executeEndRoundUI(data.winTeam, data.idx, data.msg);
      }
    });

    myConnToHost.on('close', () => {
      alert("O Host encerrou a sala.");
      window.location.reload();
    });
  });

  myPeer.on('error', (err) => {
    document.getElementById('client-status').innerText = "Erro: Não encontrou a sala.";
    document.getElementById('btn-connect').disabled = false;
  });
}

/* ═══════════════════════════════════════════════════════
   JOGO BASE E SINCRONIZAÇÃO
═══════════════════════════════════════════════════════ */
function startMatch() {
  safeAudioInit();
  STATE.scores = [0, 0];
  STATE.roundWinner = null;
  document.getElementById('start-screen').style.display = 'none';
  
  if (netMode === 'host') {
    const seatOrder = [2, 1, 3];
    connectedClients.forEach((conn, index) => {
       conn.assignedIdx = seatOrder[index];
       conn.send({ type: 'game_start', yourIdx: conn.assignedIdx });
    });
  }
  
  updateScoreDisplay();
  if (netMode !== 'client') startRound();
}

function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = STATE.scores[0];
  document.getElementById('scoreB').textContent = STATE.scores[1];
  document.getElementById('scoreA').classList.toggle('winning', STATE.scores[0] > STATE.scores[1]);
  document.getElementById('scoreB').classList.toggle('winning', STATE.scores[1] > STATE.scores[0]);

  if (myPlayerIdx === 1 || myPlayerIdx === 3) {
      document.getElementById('label-team-a').innerText = "Oponentes";
      document.getElementById('label-team-b').innerText = "Sua Dupla";
  } else {
      document.getElementById('label-team-a').innerText = "Sua Dupla";
      document.getElementById('label-team-b').innerText = "Oponentes";
  }
}

function startRoundBtn() {
    document.getElementById('next-btn').disabled = true;
    if (netMode === 'client') {
        myConnToHost.send({ type: 'next_round_request' });
    } else {
        startRound();
    }
}

function triggerPassVisual(pIdx) {
    window.visualPass[pIdx] = true;
    renderHands(STATE.isOver); 
    
    setTimeout(() => {
        window.visualPass[pIdx] = false;
        renderHands(STATE.isOver); 
    }, 2500);
}

function startRound() {
  if (netMode === 'client') return; 
  if (!STATE.isOver && STATE.hands.length > 0) return; 

  safeAudioInit();
  if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);

  document.getElementById('scoreA').classList.remove('score-blink-green');
  document.getElementById('scoreB').classList.remove('score-blink-green');

  STATE.isOver = false;
  STATE.isBlocked = true;
  STATE.passCount = 0;
  STATE.playerPassed.fill(false);
  window.visualPass.fill(false);
  STATE.playerMemory = [[], [], [], []];
  STATE.handSize = [7, 7, 7, 7];

  document.getElementById('result-area').style.display = 'none';
  document.getElementById('next-btn').disabled = false;
  
  for (let i = 0; i < 4; i++) {
    document.getElementById(`hand-${i}`).classList.remove('hand-pass-blink', 'hand-win-blink');
  }
  
  broadcastState(); 
  updateStatus('EMBARALHANDO...', '');

  if (netMode === 'host') broadcastToClients({ type: 'shuffle_start' });
  
  runShuffleAnimation(() => dealAndStart());
}

function runShuffleAnimation(cb) {
  const snake = document.getElementById('snake');
  snake.innerHTML = '';
  window.minScaleReached = 1.2;
  window.currentSnakeScale = 1.2;
  window.currentSnakeCx = 0;
  window.currentSnakeCy = 0;
  snake.style.transform = 'scale(1.2) translate(0px,0px)';

  const fakes = [];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'tile tile-v hidden';
    el.style.cssText = 'position:absolute;left:-9px;top:-18px;transition:transform .15s ease-in-out;';
    scatter(el);
    snake.appendChild(el);
    fakes.push(el);
  }

  if (navigator.vibrate) navigator.vibrate([25,35,25,35,25]);
  let shuffles = 0;
  const si = setInterval(() => {
    fakes.forEach(el => scatter(el));
    playClack(400 + Math.random() * 200, 0.04);
    if (++shuffles >= 8) {
      clearInterval(si);
      setTimeout(() => {
          if (cb) cb();
      }, 300);
    }
  }, 150);
}

function scatter(el) {
  const rx = (Math.random() - .5) * 120;
  const ry = (Math.random() - .5) * 120;
  const rot = Math.random() * 360;
  el.style.transform = `translate(${rx}px,${ry}px) rotate(${rot}deg)`;
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

  document.getElementById('snake').innerHTML = '';
  STATE.isBlocked = false; 
  
  broadcastState(); 
  renderHands();
  processTurn();
}

function updateStatus(text, cls = '') {
  updateStatusLocal(text, cls);
  if (netMode === 'host') broadcastToClients({ type: 'status', text, cls });
}

function updateStatusLocal(text, cls) {
  const el = document.getElementById('game-status');
  el.innerText = text;
  el.className = cls ? `active` : (text.includes('PAS') ? 'pass' : '');
}

function renderBoardFromState() {
  const s = document.getElementById('snake');
  s.innerHTML = ''; 
  STATE.positions.forEach((nP, i) => {
    const el = document.createElement('div');
    el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'}`;
    el.style.left = (nP.x - (nP.isV ? 9 : 18)) + 'px';
    el.style.top  = (nP.y - (nP.isV ? 18 : 9)) + 'px';
    el.innerHTML = `<div class="half">${getPips(nP.v1)}</div><div class="half">${getPips(nP.v2)}</div>`;
    if (i === STATE.positions.length - 1 && !STATE.isOver) el.classList.add('last-move');
    s.appendChild(el);
  });
}

function renderHands(reveal = false) {
  for (let i = 0; i < 4; i++) {
    const viewPos = (i - myPlayerIdx + 4) % 4;
    const isSide = (viewPos === 1 || viewPos === 3);
    
    const c = document.getElementById(`hand-${viewPos}`);
    c.innerHTML = '';
    
    const isBlinking = window.visualPass && window.visualPass[i];
    
    c.className = `hand ${isSide ? 'hand-side' : ''} ${i === STATE.current && !STATE.isOver ? 'active-turn' : ''}`;
    if (isBlinking) c.classList.add('hand-pass-blink');

    STATE.hands[i].forEach((t, idx) => {
      const el = document.createElement('div');
      const isDouble = t[0] === t[1];
      const hidden = !reveal && i !== myPlayerIdx;
      
      el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${hidden ? 'hidden' : ''} ${isDouble ? 'tile-double' : ''}`;
      el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
      
      if (i === myPlayerIdx) el.id = `my-tile-${idx}`;
      c.appendChild(el);
    });

    if (STATE.hands[i].length > 0 && !STATE.isOver) {
      const ind = document.createElement('div');
      ind.className = 'hand-indicators';
      
      if (isBlinking) {
        const x = document.createElement('div');
        x.className = 'pass-x'; x.innerText = '✕';
        ind.appendChild(x);
      }
      
      const badge = document.createElement('div');
      badge.className = 'tile-count';
      badge.innerText = STATE.hands[i].length;
      ind.appendChild(badge);
      c.appendChild(ind);
    }
  }

  if (STATE.current === myPlayerIdx && !STATE.isBlocked && !STATE.isOver) {
     const moves = getMoves(STATE.hands[myPlayerIdx]);
     if (moves.length > 0) highlight(moves);
  }
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
      if (STATE.extremes[0] !== null) {
        [STATE.extremes[0], STATE.extremes[1]].forEach(n => {
          if (!STATE.playerMemory[STATE.current].includes(n))
            STATE.playerMemory[STATE.current].push(n);
        });
      }

      const passedIdx = STATE.current;

      if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx: passedIdx });
      triggerPassVisual(passedIdx);

      updateStatus(`✕ ${NAMES[passedIdx]} PASSOU`, 'pass');
      setTimeout(() => updateStatus('', ''), 2000);

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
    if (netMode === 'host') broadcastState(); 
    updateStatus('SUA VEZ!', 'active');
    if (navigator.vibrate) navigator.vibrate([25,40,25]);
    
    renderHands(); 
    return;
  }

  if (netMode !== 'client') {
     const isHumanClientTurn = connectedClients.some(c => c.assignedIdx === STATE.current);
     
     if (isHumanClientTurn) {
         STATE.isBlocked = false; 
         updateStatus(`VEZ DE ${NAMES[STATE.current]}...`);
         broadcastState(); 
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
    const isV = !isD;
    nP = { x:0, y:0, v1:tile[0], v2:tile[1], isV };
    if (isD) {
      STATE.ends[0] = { hscX:0, hscY:0,   dir:270, lineCount:1, lastVDir:270, wasDouble:true };
      STATE.ends[1] = { hscX:0, hscY:0,   dir:90,  lineCount:1, lastVDir:90,  wasDouble:true };
    } else {
      STATE.ends[0] = { hscX:0, hscY:-9,  dir:270, lineCount:1, lastVDir:270, wasDouble:false };
      STATE.ends[1] = { hscX:0, hscY:9,   dir:90,  lineCount:1, lastVDir:90,  wasDouble:false };
    }
  } else {
    const c = STATE.extremes[side];
    const vMatch = tile[0] === c ? tile[0] : tile[1];
    const vOther = tile[0] === c ? tile[1] : tile[0];
    STATE.extremes[side] = vOther;

    const e = STATE.ends[side];
    let isVertFlow = (e.dir === 90 || e.dir === 270);
    const maxCount = isVertFlow ? 6 : 2;

    if (e.lineCount >= maxCount && !isD && !e.wasDouble) {
      if (isVertFlow) { e.lastVDir = e.dir; e.dir = side === 1 ? 0 : 180; }
      else            { e.dir = e.lastVDir === 90 ? 270 : 90; }
      e.lineCount = 1;
      isVertFlow = (e.dir === 90 || e.dir === 270);
    }
    e.lineCount++;

    const dx = e.dir===0?1 : e.dir===180?-1 : 0;
    const dy = e.dir===90?1 : e.dir===270?-1 : 0;
    const chX = e.hscX + 18*dx, chY = e.hscY + 18*dy;

    let cx, cy, newHscX, newHscY;
    const isV = isVertFlow ? !isD : isD;

    if (isD) { cx = chX; cy = chY; newHscX = chX; newHscY = chY; } 
    else { cx = (chX + (chX + 18*dx))/2; cy = (chY + (chY + 18*dy))/2; newHscX = chX + 18*dx; newHscY = chY + 18*dy; }

    const swap = (e.dir===180 || e.dir===270);
    nP = { x:cx, y:cy, v1:swap?vOther:vMatch, v2:swap?vMatch:vOther, isV };
    e.hscX = newHscX; e.hscY = newHscY; e.wasDouble = isD;
  }

  STATE.positions.push(nP);
  try { updateSnakeScale(); } catch(err) {}
  STATE.passCount = 0;
  
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

function animateTile(pIdx, target, cb) {
  const proxy = document.createElement('div');
  proxy.className = `tile moving-proxy ${target.isV ? 'tile-v' : 'tile-h'}`;
  proxy.innerHTML = `<div class="half">${getPips(target.v1)}</div><div class="half">${getPips(target.v2)}</div>`;
  proxy.style.transition = 'none';
  document.body.appendChild(proxy);

  const viewPos = (pIdx - myPlayerIdx + 4) % 4;
  const hRect = document.getElementById(`hand-${viewPos}`).getBoundingClientRect();
  const startX = hRect.left + hRect.width/2;
  const startY = hRect.top  + hRect.height/2;

  const bRect = document.getElementById('board-container').getBoundingClientRect();
  const bCX = bRect.left + bRect.width/2;
  const bCY = bRect.top  + bRect.height/2;
  const sc  = window.currentSnakeScale || 1;
  const cx  = window.currentSnakeCx || 0;
  const cy  = window.currentSnakeCy || 0;
  const destX = bCX + (target.x + cx) * sc;
  const destY = bCY + (target.y + cy) * sc;

  const dur = 400, t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const ease = p < .5 ? 2*p*p : -1+(4-2*p)*p;
    proxy.style.left = `${startX + (destX-startX)*ease}px`;
    proxy.style.top  = `${startY + (destY-startY)*ease}px`;
    proxy.style.transform = `translate(-50%,-50%) scale(${0.4 + (sc-0.4)*ease})`;
    if (p < 1) requestAnimationFrame(step);
    else {
      playClack();
      setTimeout(() => { proxy.remove(); cb(); }, 10);
    }
  }
  requestAnimationFrame(step);
}

function updateSnakeScale() {
  const s = document.getElementById('snake');
  const b = document.getElementById('board-container');
  if (!STATE.positions.length) return;

  let minX=0, maxX=0, minY=0, maxY=0;
  STATE.positions.forEach(p => {
    const w = p.isV ? 9 : 18, h = p.isV ? 18 : 9;
    minX = Math.min(minX, p.x-w); maxX = Math.max(maxX, p.x+w);
    minY = Math.min(minY, p.y-h); maxY = Math.max(maxY, p.y+h);
  });

  const pad = 60;
  const scX = b.clientWidth  / ((maxX-minX) + pad || 1);
  const scY = b.clientHeight / ((maxY-minY) + pad || 1);
  const target = Math.min(scX, scY, 1.2);

  if (typeof window.minScaleReached === 'undefined') window.minScaleReached = 1.2;
  if (target < window.minScaleReached) window.minScaleReached = target;

  const cx = -(minX+maxX)/2;
  const cy = -(minY+maxY)/2;
  s.style.transform = `scale(${window.minScaleReached}) translate(${cx}px,${cy}px)`;
  window.currentSnakeScale = window.minScaleReached;
  window.currentSnakeCx = cx;
  window.currentSnakeCy = cy;
}

function highlight(moves) {
  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      safeAudioInit();
      if (STATE.isBlocked) return;
      const isLast = STATE.hands[myPlayerIdx].length === 1;
      if (x.side === 'both' && STATE.extremes[0] !== STATE.extremes[1] && !isLast) {
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
  STATE.pendingIdx = null;
}

function executeMove(s) {
  document.getElementById('side-picker').style.display = 'none';
  STATE.isBlocked = false;
  play(myPlayerIdx, STATE.pendingIdx, s);
}

function endRound(type, idx) {
  if (netMode === 'client') return; 
  if (STATE.isOver) return;
  STATE.isOver = true;

  const ptA = STATE.hands[0].concat(STATE.hands[2]).reduce((s, t) => s + t[0] + t[1], 0);
  const ptB = STATE.hands[1].concat(STATE.hands[3]).reduce((s, t) => s + t[0] + t[1], 0);

  let winTeam = -1;
  let msg = "";

  if (type === 'win') {
    winTeam = idx % 2 === 0 ? 0 : 1;
    msg = winTeam === 0 ? `VITÓRIA!\nEQUIPE A BATEU` : `VITÓRIA!\nEQUIPE B BATEU`;
  } else {
    if (ptA < ptB) winTeam = 0; else if (ptB < ptA) winTeam = 1;
    
    if (winTeam === 0) msg = `TRANCADO: EQUIPE A VENCEU\n(${ptA} vs ${ptB} pts)`;
    else if (winTeam === 1) msg = `TRANCADO: EQUIPE B VENCEU\n(${ptB} vs ${ptA} pts)`;
    else msg = `EMPATE NO TRANCO\n(${ptA} pts)`;
    
    STATE.roundWinner = winTeam === 0 ? 0 : (winTeam === 1 ? 1 : null); 
  }

  if (winTeam !== -1) STATE.scores[winTeam]++;
  
  broadcastState(); 
  if (netMode === 'host') broadcastToClients({ type: 'end_round', winTeam, idx, msg });
  
  executeEndRoundUI(winTeam, idx, msg); 
}

function executeEndRoundUI(winTeam, idx, msg) {
  renderHands(true);
  updateScoreDisplay();
  if (winTeam === 0 || winTeam === 1) playVictory();

  if (winTeam === 0) {
    document.getElementById(`hand-${(0 - myPlayerIdx + 4) % 4}`).classList.add('hand-win-blink');
    document.getElementById(`hand-${(2 - myPlayerIdx + 4) % 4}`).classList.add('hand-win-blink');
  } else if (winTeam === 1) {
    document.getElementById(`hand-${(1 - myPlayerIdx + 4) % 4}`).classList.add('hand-win-blink');
    document.getElementById(`hand-${(3 - myPlayerIdx + 4) % 4}`).classList.add('hand-win-blink');
  }

  updateStatusLocal(msg, 'active');

  const resultArea = document.getElementById('result-area');
  const nextBtn = document.getElementById('next-btn');
  resultArea.style.display = 'block';

  if (STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore) {
    const isTeamA = STATE.scores[0] >= STATE.targetScore;
    const finalMsg = isTeamA ? "🏆 EQUIPE A CAMPEÃ!" : "🏆 EQUIPE B CAMPEÃ!";
    updateStatusLocal(`${finalMsg}\nPlacar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    nextBtn.innerText = 'VOLTAR AO MENU';
    nextBtn.disabled = false;
    nextBtn.onclick = () => { window.location.reload(); };
  } else {
    let timeLeft = 7;
    nextBtn.innerText = `Próxima (${timeLeft}s)`;
    nextBtn.disabled = false;
    
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0) {
            nextBtn.innerText = `Próxima (${timeLeft}s)`;
        } else {
            clearInterval(STATE.autoNextInterval);
            startRoundBtn();
        }
    }, 1000);

    nextBtn.onclick = () => {
        clearInterval(STATE.autoNextInterval);
        startRoundBtn();
    };
  }
}

function getPips(v) {
  const p = {
    0: '',
    1: '<div class="pip" style="grid-area:2/2"></div>',
    2: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div>',
    3: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div>',
    4: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    5: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    6: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/1"></div><div class="pip" style="grid-area:2/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
  };
  return p[v] || '';
}

function getMoves(hand) {
  if (!STATE.positions.length) {
    if (STATE.roundWinner === null) {
      const idx = hand.findIndex(t => t[0]===6 && t[1]===6);
      if (idx !== -1) return [{ idx, side:'any' }];
    }
    return hand.map((_, i) => ({ idx:i, side:'any' }));
  }
  return hand.map((t, i) => {
    const L = t[0]===STATE.extremes[0] || t[1]===STATE.extremes[0];
    const R = t[0]===STATE.extremes[1] || t[1]===STATE.extremes[1];
    return L && R ? { idx:i, side:'both' } : L ? { idx:i, side:0 } : R ? { idx:i, side:1 } : null;
  }).filter(Boolean);
}
function chooseBotMove(botIdx, moves) {
    if (STATE.difficulty === 'hard') {
        let bestMove = null; let bestScore = -Infinity;
        moves.forEach(move => {
            const tile = STATE.hands[botIdx][move.idx];
            const side = move.side === 'both' ? 0 : (move.side === 'any' ? 1 : move.side);
            let score = calculateWeight(botIdx, tile, side);
            const nextOpponent = (botIdx + 1) % 4;
            const simExtremes = [...STATE.extremes];
            simExtremes[side] = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
            const finalScore = score - simulateOpponentDanger(nextOpponent, simExtremes);
            if (finalScore > bestScore) { bestScore = finalScore; bestMove = move; }
        });
        return bestMove;
    }
    const scored = moves.map(m => {
        const side = m.side === 'both' ? 0 : (m.side === 'any' ? 1 : m.side);
        return { ...m, weight: calculateWeight(botIdx, STATE.hands[botIdx][m.idx], side) };
    });
    scored.sort((a, b) => b.weight - a.weight);
    return scored[0];
}
function calculateWeight(botIdx, tile, side) {
    const partner = (botIdx + 2) % 4, opp1 = (botIdx + 1) % 4, opp2 = (botIdx + 3) % 4;
    const nextExtreme = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
    let w = (tile[0] + tile[1]);
    if (tile[0] === tile[1]) w += 25;
    if (STATE.playerMemory[opp1].includes(nextExtreme)) w += 50;
    if (STATE.playerMemory[opp2].includes(nextExtreme)) w += 50;
    if (STATE.playerMemory[partner].includes(nextExtreme)) w -= 40;
    if (STATE.difficulty === 'normal' || STATE.difficulty === 'hard') {
        if (STATE.handSize[opp1] <= 2 || STATE.handSize[opp2] <= 2) w += 30;
    }
    return w;
}
function simulateOpponentDanger(oppIdx, simExtremes) {
    let danger = 0;
    const cl = STATE.playerMemory[oppIdx].includes(simExtremes[0]);
    const cr = STATE.playerMemory[oppIdx].includes(simExtremes[1]);
    if (cl && cr) return -60;
    if (!cl) danger += 20;
    if (!cr) danger += 20;
    if (STATE.handSize[oppIdx] <= 2) danger *= 2;
    return danger;
}

function safeAudioInit() {
  try {
    if (!audioCtx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) audioCtx = new A();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) {}
}
function playClack(freq = 800, dur = 0.05) {
  if (navigator.vibrate) navigator.vibrate(30);
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(0.45, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}
function playPass()    { playClack(300, 0.12); }
function playVictory() { [600, 800, 1000].forEach((f, i) => setTimeout(() => playClack(f, 0.1), i * 120)); }