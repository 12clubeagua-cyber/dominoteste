/* ═══════════════════════════════════════════════════════
   INTERFACE, ANIMAÇÕES E SONS (ui.js)
═══════════════════════════════════════════════════════ */
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