/* ═══════════════════════════════════════════════════════
   INTERFACE VISUAL (ui.js)
═══════════════════════════════════════════════════════ */

function updateScoreDisplay() {
  document.getElementById('scoreA').textContent = STATE.scores[0];
  document.getElementById('scoreB').textContent = STATE.scores[1];
  
  const teamLabels = (myPlayerIdx === 1 || myPlayerIdx === 3) ? ["Oponentes", "Sua Dupla"] : ["Sua Dupla", "Oponentes"];
  document.getElementById('label-team-a').innerText = teamLabels[0];
  document.getElementById('label-team-b').innerText = teamLabels[1];
}

function renderBoardFromState() {
  const container = document.getElementById('snake');
  if (!container) return;
  container.innerHTML = ''; // Limpa tudo para redesenhar

  STATE.positions.forEach(p => {
    const tileEl = document.createElement('div');
    tileEl.className = `tile ${p.v1 === p.v2 ? 'double' : ''}`;
    tileEl.style.left = `calc(50% + ${p.x}px)`;
    tileEl.style.top = `calc(50% + ${p.y}px)`;
    tileEl.style.transform = `translate(-50%, -50%) rotate(${p.rot}deg)`;
    
    tileEl.innerHTML = `
      <div class="tile-half">${getPips(p.v1)}</div>
      <div class="tile-half">${getPips(p.v2)}</div>
    `;
    container.appendChild(tileEl);
  });
}

function renderHands(showAll = false) {
  for (let i = 0; i < 4; i++) {
    const isLocal = (i === myPlayerIdx);
    const handEl = document.getElementById(`hand-${(i - myPlayerIdx + 4) % 4}`);
    if (!handEl) continue;
    
    handEl.innerHTML = '';
    handEl.className = 'hand' + (i % 2 !== 0 ? ' hand-side' : '');
    if (window.visualPass[i]) handEl.classList.add('hand-pass-blink');

    const handData = STATE.hands[i] || [];
    handData.forEach((tile, idx) => {
      const tEl = document.createElement('div');
      tEl.className = 'tile';
      if (isLocal) tEl.id = `my-tile-${idx}`;

      if (isLocal || showAll) {
        if (tile[0] === tile[1]) tEl.classList.add('double');
        tEl.innerHTML = `
          <div class="tile-half">${getPips(tile[0])}</div>
          <div class="tile-half">${getPips(tile[1])}</div>
        `;
      } else {
        tEl.classList.add('tile-back');
      }
      handEl.appendChild(tEl);
    });
  }
}

function animateTile(pIdx, nP, callback) {
  playClack();
  
  // Criar peça fantasma para a animação
  const proxy = document.createElement('div');
  proxy.className = `tile moving-proxy ${nP.v1 === nP.v2 ? 'double' : ''}`;
  proxy.innerHTML = `
    <div class="tile-half">${getPips(nP.v1)}</div>
    <div class="tile-half">${getPips(nP.v2)}</div>
  `;
  
  // Posição inicial (mão do jogador)
  const handEl = document.getElementById(`hand-${(pIdx - myPlayerIdx + 4) % 4}`);
  const rect = handEl.getBoundingClientRect();
  proxy.style.left = (rect.left + rect.width/2) + 'px';
  proxy.style.top = (rect.top + rect.height/2) + 'px';
  
  document.body.appendChild(proxy);

  // Forçar reflow para o CSS entender a posição inicial antes da transição
  proxy.getBoundingClientRect();

  // Posição final (mesa)
  proxy.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  proxy.style.left = `calc(50% + ${nP.x * window.currentSnakeScale}px)`;
  proxy.style.top = `calc(50% + ${nP.y * window.currentSnakeScale}px)`;
  proxy.style.transform = `translate(-50%, -50%) rotate(${nP.rot}deg) scale(${window.currentSnakeScale})`;

  proxy.addEventListener('transitionend', () => {
    proxy.remove(); // Remove o fantasma
    if (callback) callback(); // Chama o callback que vai renderizar a peça real
  }, { once: true });
}

function updateStatus(text, cls = '') {
  const el = document.getElementById('game-status');
  if (el) {
    el.innerText = text;
    el.className = cls;
  }
}

function endRound(msg) {
  STATE.isOver = true;
  STATE.isBlocked = true;
  
  // Cálculo de pontos simplificado para o exemplo
  let points = 0;
  STATE.hands.forEach(h => h.forEach(t => points += (t[0] + t[1])));
  
  const winTeam = (STATE.hands[0].length === 0 || STATE.hands[2].length === 0) ? 0 : 1;
  STATE.scores[winTeam] += points;
  STATE.roundWinner = STATE.hands.findIndex(h => h.length === 0);
  if (STATE.roundWinner === -1) STATE.roundWinner = 0;

  updateScoreDisplay();
  renderHands(true);
  renderBoardFromState();
  
  document.getElementById('res-detail').innerText = msg + " +" + points + " pontos.";
  document.getElementById('result-area').style.display = 'block';
  
  if (STATE.scores[winTeam] >= STATE.targetScore) {
    document.getElementById('next-btn').innerText = "VOLTAR AO MENU";
    document.getElementById('next-btn').onclick = () => window.location.reload();
  }
}

function triggerPassVisual(pIdx) {
    window.visualPass[pIdx] = true;
    renderHands(); 
    setTimeout(() => {
        window.visualPass[pIdx] = false;
        renderHands(); 
    }, 1500);
}

function updateSnakeScale() {
    const container = document.getElementById('board-container');
    const snake = document.getElementById('snake');
    if (!container || !snake) return;
    
    // Lógica simples de zoom out se a cobra crescer muito
    const bounds = snake.getBoundingClientRect();
    const parent = container.getBoundingClientRect();
    
    if (bounds.width > parent.width * 0.8 || bounds.height > parent.height * 0.8) {
        window.currentSnakeScale *= 0.95;
        snake.style.transform = `scale(${window.currentSnakeScale})`;
    }
}
