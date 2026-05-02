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
  let name = "";
  let valid = false;
  
  while (!valid) {
    const input = prompt("Digite seu apelido (até 10 letras, apenas A-Z):", NameManager.get(0) || "");
    if (input === null) return; // Cancelou
    
    const cleaned = input.trim().toUpperCase();
    if (cleaned.length > 0 && cleaned.length <= 10 && /^[A-Z]+$/.test(cleaned)) {
      name = cleaned;
      valid = true;
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
    // i é o índice da mão no DOM (0-3), mapeado pela função de renderização. 
    // Precisamos identificar qual é o assento absoluto (ID 0-3) que esta mão representa.
    // Como viewPos = (i - myPlayerIdx + 4) % 4, então i = (viewPos + myPlayerIdx) % 4.
    const absoluteSeat = (viewPos + myPlayerIdx) % 4;
    nameEl.innerText = NameManager.get(absoluteSeat);
    c.appendChild(nameEl);

    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-row';
    c.appendChild(tilesContainer);

    STATE.hands[i].forEach((t, idx) => {
      const el = document.createElement('div');
      const hidden = !reveal && i !== myPlayerIdx;
      el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${hidden ? 'hidden' : ''} ${t[0] === t[1] ? 'tile-double' : ''}`;
      el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
      if (i === myPlayerIdx) el.id = `my-tile-${idx}`;
      tilesContainer.appendChild(el);
    });

    if (STATE.hands[i].length > 0 && !STATE.isOver) {
      const ind = document.createElement('div');
      ind.className = 'hand-indicators';

      // Badge (Contador) primeiro
      const badge = document.createElement('div');
      badge.className = 'tile-count';
      badge.innerText = STATE.hands[i].length;
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

  // 1. COMENTADO: Isso impede a tela gigante de aparecer sobre as peças
  // const resArea = document.getElementById('result-area');
  // if (resArea) resArea.style.setProperty('display', 'block', 'important');
  
  // 2. NOVA LÓGICA (Sem depender do botão next-btn do HTML)
  if (STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore) {
    // Alguém atingiu os pontos para vencer a partida inteira
    const finalMsg = STATE.scores[0] >= STATE.targetScore ? "🏆 EQUIPE A CAMPEÃ!" : "🏆 EQUIPE B CAMPEÃ!";
    updateStatusLocal(`${finalMsg} - Placar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    
    // Como não há botão, reinicia o jogo automaticamente após 6 segundos
    setTimeout(() => window.location.reload(), 6000);
    
  } else {
    // Apenas acabou a rodada. Prepara a próxima automaticamente.
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    
    let timeLeft = CONFIG.GAME.RESULT_DISPLAY_TIME; // Pega o tempo do seu config.js
    
    // Atualiza a barra de status com a mensagem e o tempo restante
    updateStatusLocal(`${msg} (Próxima em ${timeLeft}s)`, 'active');
    
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0) {
             updateStatusLocal(`${msg} (Próxima em ${timeLeft}s)`, 'active');
        } else { 
            clearInterval(STATE.autoNextInterval); 
            startRoundBtn(); // Começa a próxima rodada
        }
    }, 1000);
    }
    }

    function exitGame() {
    if (confirm("Deseja mesmo sair da partida?")) {
        window.location.href = window.location.origin + window.location.pathname;
    }
    }