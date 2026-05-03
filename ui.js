/* 
   INTERFACE VISUAL (ui.js)
 */

function updateScoreDisplay() {
  const scoreA = document.getElementById('scoreA');
  const scoreB = document.getElementById('scoreB');
  const labelA = document.getElementById('label-team-a');
  const labelB = document.getElementById('label-team-b');
  if (!scoreA || !scoreB || !labelA || !labelB) return;

  scoreA.textContent = STATE.scores[0];
  scoreB.textContent = STATE.scores[1];
  scoreA.classList.toggle('winning', STATE.scores[0] > STATE.scores[1]);
  scoreB.classList.toggle('winning', STATE.scores[1] > STATE.scores[0]);

  const teamLabels = (myPlayerIdx === 1 || myPlayerIdx === 3) ? ["Oponentes", "Sua Dupla"] : ["Sua Dupla", "Oponentes"];
  labelA.innerText = teamLabels[0];
  labelB.innerText = teamLabels[1];
}

function changeName() {
  let name = "";
  let valid = false;

  while (!valid) {
    const input = prompt("Digite seu apelido (ate 10 letras, apenas A-Z):", "SEUNOME");
    if (input === null) return; 

    const cleaned = input.trim().toUpperCase();
    if (cleaned.length > 0 && cleaned.length <= 10 && /^[A-Z]+$/.test(cleaned)) {
      name = cleaned;
      valid = true;
    } else {
      alert("Nome invalido. Use apenas letras (A-Z), entre 1 e 10 caracteres.");
    }
  }

  NameManager.set(0, name);
  updateScoreDisplay();
}

function checkAndPromptName() {
    if (!localStorage.getItem('userName')) {
        changeName();
    }
}

function triggerPassVisual(pIdx) {
    if (!window.visualPass) window.visualPass = [false, false, false, false];
    
    window.visualPass[pIdx] = true;
    renderHands(STATE.isOver); 
    setTimeout(() => {
        window.visualPass[pIdx] = false;
        renderHands(STATE.isOver); 
    }, CONFIG?.GAME?.PASS_DISPLAY_TIME ?? 1500);
}

function updateStatus(text, cls = '') {
  updateStatusLocal(text, cls);
  if (netMode === 'host') broadcastToClients({ type: 'status', text, cls });
}

function updateStatusLocal(text, cls) {
  const el = document.getElementById('game-status');
  if (!el) return;
  
  let displayMsg = text;
  const allNames = NameManager.getAll();
  Object.keys(allNames).forEach(idx => {
      const genericName = `JOGADOR ${parseInt(idx) + 1}`;
      if (displayMsg.includes(genericName)) {
          displayMsg = displayMsg.replace(genericName, (parseInt(idx) === myPlayerIdx ? "VOCE" : allNames[idx]));
      }
  });
  
  el.innerText = displayMsg;
  el.className = (cls === 'active' || displayMsg.includes('PASSA') || displayMsg.includes('PASSOU')) ? cls : '';
}

function renderBoardFromState() {
  const s = document.getElementById('snake');
  if (!s) return;
  
  const children = Array.from(s.children);
  children.forEach(child => {
      if (!child.classList.contains('temp-hidden')) child.remove();
  });
  
  const W = CONFIG?.GAME?.TILE_W ?? 18;
  const L = CONFIG?.GAME?.TILE_L ?? 36;

  STATE.positions.forEach((nP, i) => {
    const isAlreadyAnimating = Array.from(s.children).some(child => 
        child.classList.contains('temp-hidden') && 
        parseInt(child.dataset.x) === nP.x && 
        parseInt(child.dataset.y) === nP.y
    );
    
    if (isAlreadyAnimating) return;

    const el = document.createElement('div');
    el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'}`;
    const offsetX = nP.isV ? (W / 2) : (L / 2);
    const offsetY = nP.isV ? (L / 2) : (W / 2);

    el.style.left = (nP.x - offsetX) + 'px';
    el.style.top  = (nP.y - offsetY) + 'px';
    
    el.innerHTML = `<div class="half">${getPips(nP.v1)}</div><div class="half">${getPips(nP.v2)}</div>`;
    if (i === STATE.positions.length - 1 && !STATE.isOver) el.classList.add('last-move');
    s.appendChild(el);
  });
}

function renderHands(reveal = false) {
  // ✅ ESCONDER PICKER QUANDO RENDERIZAR MÃOS
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  for (let i = 0; i < 4; i++) {
    const c = document.getElementById(`hand-${(i - myPlayerIdx + 4) % 4}`);
    if (c) c.innerHTML = '';
  }

  for (let i = 0; i < 4; i++) {
    const viewPos = (i - myPlayerIdx + 4) % 4;
    const isSide = (viewPos === 1 || viewPos === 3);
    const c = document.getElementById(`hand-${viewPos}`);
    if (!c) continue;
    
    const isBlinking = window.visualPass && window.visualPass[i];
    c.className = `hand ${isSide ? 'hand-side' : ''} ${i === STATE.current && !STATE.isOver && !STATE.isBlocked ? 'active-turn' : ''} ${isBlinking ? 'hand-passed' : ''}`;
    
    // Adiciona marcador de vez
    if (!c.querySelector('.turn-indicator')) {
        const ind = document.createElement('div');
        ind.className = 'turn-indicator';
        c.appendChild(ind);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'player-name-label';
    nameEl.innerText = NameManager.get((myPlayerIdx + viewPos) % 4);
    c.appendChild(nameEl);

    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-row';
    c.appendChild(tilesContainer);

    const isMyHand = (i === myPlayerIdx);
    if (isMyHand || reveal) {
      (STATE.hands[i] || []).forEach((t, idx) => {
        const el = document.createElement('div');
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${t[0] === t[1] ? 'tile-double' : ''}`;
        el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
        if (isMyHand) el.id = `my-tile-${idx}`;
        tilesContainer.appendChild(el);
      });
    } else {
      const count = STATE.handSize[i] || 0;
      for (let k = 0; k < count; k++) {
        const el = document.createElement('div');
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} hidden`;
        el.innerHTML = `<div class="half"></div><div class="half"></div>`;
        tilesContainer.appendChild(el);
      }
    }
    
    const displayCount = (i === myPlayerIdx) ? (STATE.hands[i]?.length || 0) : (STATE.handSize[i] || 0);
    if (displayCount > 0 && !STATE.isOver) {
      const ind = document.createElement('div');
      ind.className = 'hand-indicators';
      const badge = document.createElement('div');
      badge.className = 'tile-count';
      badge.innerText = displayCount;
      ind.appendChild(badge);
      if (isBlinking) {
        const x = document.createElement('div');
        x.className = 'pass-x'; x.innerText = '';
        ind.appendChild(x);
      }
      c.appendChild(ind);
    }
  }
  if (STATE.current === myPlayerIdx && !STATE.isOver && !STATE.isBlocked) {
     STATE.isBlocked = false;
     const moves = getMoves(STATE.hands[myPlayerIdx]);
     if (moves.length > 0) highlight(moves);
  }
}

function executeEndRoundUI(winTeam, idx, msg) {
  renderHands(true);
  updateScoreDisplay();
  
  if (winTeam === 0 || winTeam === 1) playVictory();
  if (winTeam === 0 || winTeam === 1) {
    const teamA = [0, 2], teamB = [1, 3];
    (winTeam === 0 ? teamA : teamB).forEach(pIdx => {
        const handEl = document.getElementById(`hand-${(pIdx - myPlayerIdx + 4) % 4}`);
        if (handEl) handEl.classList.add('hand-win-blink');
    });
  }

  const isMatchOver = STATE.matchOver || STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore;
  if (isMatchOver) {
    STATE.matchOver = true;
    if (netMode === 'host') broadcastState();
    const isMyTeamWinner = (STATE.scores[0] >= STATE.targetScore) ? (myPlayerIdx % 2 === 0) : (myPlayerIdx % 2 === 1);
    updateStatusLocal(`${isMyTeamWinner ? "SUA DUPLA E CAMPEAO!" : "OPONENTES SAO CAMPEOES!"} Placar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    setTimeout(() => window.location.reload(), 6000);
  } else {
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    let timeLeft = CONFIG?.GAME?.RESULT_DISPLAY_TIME ?? 7;
    updateStatusLocal(`${msg} (Proxima em ${timeLeft}s)`, 'active');
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
             updateStatusLocal(`${msg} (Proxima em ${timeLeft}s)`, 'active');
        } else {
            clearInterval(STATE.autoNextInterval);
            if (typeof startRound === 'function') startRound();
        }
    }, 1000);
  }
}

function exitGame() {
  if (confirm("Deseja mesmo sair da partida?")) {
      window.location.href = window.location.origin + window.location.pathname;
  }
}

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
    checkAndPromptName();
});


