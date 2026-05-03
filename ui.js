/* ═══════════════════════════════════════════════════════
   INTERFACE VISUAL (ui.js)
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

function changeName() {
  // BUG CORRIGIDO: loop não tinha saída se o usuário cancelava dentro dele
  let name = "";
  let valid = false;

  while (!valid) {
    const input = prompt("Digite seu apelido (até 10 letras, apenas A-Z):", "seunome");
    if (input === null) return; // Cancelou — sai imediatamente

    const cleaned = input.trim().toUpperCase();
    if (cleaned.length > 0 && cleaned.length <= 10 && /^[A-Z]+$/.test(cleaned)) {
      name = cleaned;
      valid = true;
    } else {
      alert("Nome inválido. Use apenas letras (A-Z), entre 1 e 10 caracteres.");
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
    window.visualPass[pIdx] = true;
    renderHands(STATE.isOver); 
    setTimeout(() => {
        window.visualPass[pIdx] = false;
        renderHands(STATE.isOver); 
    }, CONFIG.GAME.PASS_DISPLAY_TIME);
}

function updateStatus(text, cls = '') {
  updateStatusLocal(text, cls);
  if (netMode === 'host') broadcastToClients({ type: 'status', text, cls });
}

function updateStatusLocal(text, cls) {
  const el = document.getElementById('game-status');
  if (!el) return;
  
  // Substitui JOGADOR X pelo nome correspondente, se existir
  let displayMsg = text;
  const allNames = NameManager.getAll();
  Object.keys(allNames).forEach(idx => {
      const genericName = `JOGADOR ${parseInt(idx) + 1}`;
      if (displayMsg.includes(genericName)) {
          displayMsg = displayMsg.replace(genericName, (parseInt(idx) === myPlayerIdx ? "VOCÊ" : allNames[idx]));
      }
  });
  
  el.innerText = displayMsg;
  
  if (cls === 'active') {
    el.className = 'active';
  } else if (displayMsg.includes('PASSA') || displayMsg.includes('PASSOU')) {
    el.className = 'pass';
  } else {
    el.className = '';
  }
}

function renderBoardFromState() {
  const s = document.getElementById('snake');
  if (!s) return;
  
  // Limpa apenas os tiles que não são 'temp-hidden' (tiles que estão em animação)
  const children = Array.from(s.children);
  children.forEach(child => {
      if (!child.classList.contains('temp-hidden')) child.remove();
  });
  
  const W = CONFIG.GAME.TILE_W;
  const L = CONFIG.GAME.TILE_L;

  STATE.positions.forEach((nP, i) => {
    // Verifica se este tile já está em animação (temp-hidden)
    const isAlreadyAnimating = Array.from(s.children).some(child => 
        child.classList.contains('temp-hidden') && 
        parseInt(child.dataset.x) === nP.x && 
        parseInt(child.dataset.y) === nP.y
    );
    
    if (isAlreadyAnimating) return;

    const el = document.createElement('div');
    el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'}`;
    
    // Centralização perfeita baseada nos eixos X e Y
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
  for (let i = 0; i < 4; i++) {
    const viewPos = (i - myPlayerIdx + 4) % 4;
    const isSide = (viewPos === 1 || viewPos === 3);
    const c = document.getElementById(`hand-${viewPos}`);
    if (!c) continue;
    c.innerHTML = '';
    const isBlinking = window.visualPass && window.visualPass[i];
    c.className = `hand ${isSide ? 'hand-side' : ''} ${i === STATE.current && !STATE.isOver ? 'active-turn' : ''}`;
    if (isBlinking) c.classList.add('hand-pass-blink');

    // Adiciona o nome do jogador
    const nameEl = document.createElement('div');
    nameEl.className = 'player-name-label';
    const absoluteSeat = (myPlayerIdx + viewPos) % 4;
    nameEl.innerText = NameManager.get(absoluteSeat);
    c.appendChild(nameEl);

    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-row';
    c.appendChild(tilesContainer);

    const isMyHand = (i === myPlayerIdx);
    if (isMyHand) {
      (STATE.hands[i] || []).forEach((t, idx) => {
        const el = document.createElement('div');
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${t[0] === t[1] ? 'tile-double' : ''}`;
        el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
        el.id = `my-tile-${idx}`;
        tilesContainer.appendChild(el);
      });
    } else {
      const count = reveal
        ? (STATE.hands[i] || []).length
        : (STATE.handSize[i] || 0);
      for (let k = 0; k < count; k++) {
        const el = document.createElement('div');
        if (reveal && STATE.hands[i]?.[k]) {
          const t = STATE.hands[i][k];
          el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${t[0] === t[1] ? 'tile-double' : ''}`;
          el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
        } else {
          el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} hidden`;
          el.innerHTML = `<div class="half"></div><div class="half"></div>`;
        }
        tilesContainer.appendChild(el);
      }
    }

    const displayCount = (i === myPlayerIdx)
      ? (STATE.hands[i]?.length || 0)
      : (STATE.handSize[i] || 0);

    if (displayCount > 0 && !STATE.isOver) {
      const ind = document.createElement('div');
      ind.className = 'hand-indicators';

      const badge = document.createElement('div');
      badge.className = 'tile-count';
      badge.innerText = displayCount;
      ind.appendChild(badge);

      // X (Passou) depois, "do outro lado"
      if (isBlinking) {
        const x = document.createElement('div');
        x.className = 'pass-x'; x.innerText = '✕';
        ind.appendChild(x);
      }

      c.appendChild(ind);
    }
  }
  if (STATE.current === myPlayerIdx && !STATE.isBlocked && !STATE.isOver) {
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

  if (STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore) {
    console.log(`[UI] Fim da partida. ScoreA: ${STATE.scores[0]}, ScoreB: ${STATE.scores[1]}, Target: ${STATE.targetScore}`);
    // Alguém atingiu os pontos para vencer a partida inteira
    const isMyTeamWinner = (STATE.scores[0] >= STATE.targetScore)
      ? (myPlayerIdx % 2 === 0)
      : (myPlayerIdx % 2 === 1);
    const finalMsg = isMyTeamWinner ? "🏆 SUA DUPLA É CAMPEÃ!" : "🏆 OPONENTES SÃO CAMPEÕES!";
    updateStatusLocal(`${finalMsg} Placar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    
    // Reinicia o jogo automaticamente após 6 segundos
    setTimeout(() => window.location.reload(), 6000);
    
  } else {
    // Apenas acabou a rodada. Prepara a próxima automaticamente.
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    
    let timeLeft = CONFIG.GAME.RESULT_DISPLAY_TIME;
    
    updateStatusLocal(`${msg} (Próxima em ${timeLeft}s)`, 'active');
    
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
             updateStatusLocal(`${msg} (Próxima em ${timeLeft}s)`, 'active');
        } else {
            clearInterval(STATE.autoNextInterval);
            // BUG CORRIGIDO: era 'startRoundBtn()' que não existe — corrigido para 'startRound()'
            startRound();
        }
    }, 1000);
  }
}

function exitGame() {
  if (confirm("Deseja mesmo sair da partida?")) {
      window.location.href = window.location.origin + window.location.pathname;
  }
}
