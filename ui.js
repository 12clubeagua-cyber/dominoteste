/* ═══════════════════════════════════════════════════════
   INTERFACE DO TABULEIRO (ui.js)
═══════════════════════════════════════════════════════ */

function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = STATE.scores[0];
  document.getElementById('scoreB').textContent = STATE.scores[1];
  document.getElementById('scoreA').classList.toggle('winning', STATE.scores[0] > STATE.scores[1]);
  document.getElementById('scoreB').classList.toggle('winning', STATE.scores[1] > STATE.scores[0]);

  const teamLabels = (myPlayerIdx === 1 || myPlayerIdx === 3) ? ["Oponentes", "Sua Dupla"] : ["Sua Dupla", "Oponentes"];
  document.getElementById('label-team-a').innerText = teamLabels[0];
  document.getElementById('label-team-b').innerText = teamLabels[1];
}

function startRoundBtn() {
    document.getElementById('next-btn').disabled = true;
    if (netMode === 'client') myConnToHost.send({ type: 'next_round_request' });
    else startRound();
}

function triggerPassVisual(pIdx) {
    window.visualPass[pIdx] = true;
    renderHands(STATE.isOver); 
    setTimeout(() => {
        window.visualPass[pIdx] = false;
        renderHands(STATE.isOver); 
    }, 2500);
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
  if (!s) return;
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
    if (!c) continue;
    c.innerHTML = '';
    const isBlinking = window.visualPass && window.visualPass[i];
    c.className = `hand ${isSide ? 'hand-side' : ''} ${i === STATE.current && !STATE.isOver ? 'active-turn' : ''}`;
    if (isBlinking) c.classList.add('hand-pass-blink');

    STATE.hands[i].forEach((t, idx) => {
      const el = document.createElement('div');
      const hidden = !reveal && i !== myPlayerIdx;
      el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${hidden ? 'hidden' : ''} ${t[0] === t[1] ? 'tile-double' : ''}`;
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

function highlight(moves) {
  moves.forEach(x => {
    const el = document.getElementById(`my-tile-${x.idx}`);
    if (!el) return;
    el.classList.add('playable');
    el.onclick = () => {
      safeAudioInit();
      if (STATE.isBlocked) return;
      if (x.side === 'both' && STATE.extremes[0] !== STATE.extremes[1] && STATE.hands[myPlayerIdx].length > 1) {
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

  // Correção: Só pisca se houver um vencedor claro (não pisca no empate)
  if (winTeam !== -1) {
    const teamA = [0, 2], teamB = [1, 3];
    (winTeam === 0 ? teamA : teamB).forEach(pIdx => {
        const handEl = document.getElementById(`hand-${(pIdx - myPlayerIdx + 4) % 4}`);
        if (handEl) handEl.classList.add('hand-win-blink');
    });
  }

  updateStatusLocal(msg, 'active');
  document.getElementById('result-area').style.display = 'block';
  const nextBtn = document.getElementById('next-btn');

  if (STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore) {
    const finalMsg = STATE.scores[0] >= STATE.targetScore ? "🏆 EQUIPE A CAMPEÃ!" : "🏆 EQUIPE B CAMPEÃ!";
    updateStatusLocal(`${finalMsg}\nPlacar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    nextBtn.innerText = 'VOLTAR AO MENU';
    nextBtn.onclick = () => window.location.reload();
  } else {
    let timeLeft = 7;
    nextBtn.innerText = `Próxima (${timeLeft}s)`;
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0) nextBtn.innerText = `Próxima (${timeLeft}s)`;
        else { clearInterval(STATE.autoNextInterval); startRoundBtn(); }
    }, 1000);
    nextBtn.onclick = () => { clearInterval(STATE.autoNextInterval); startRoundBtn(); };
  }
}

window.addEventListener('resize', () => {
  if (STATE.positions && STATE.positions.length > 0) {
    updateSnakeScale();
    renderBoardFromState();
  }
});
