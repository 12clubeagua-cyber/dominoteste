/* ═══════════════════════════════════════════════════════
   INTERFACE VISUAL (ui.js)
═══════════════════════════════════════════════════════ */

function renderHands(showAll = false) {
  for (let i = 0; i < 4; i++) {
    // Calcula qual elemento HTML corresponde a qual jogador
    const relativeIdx = (i - myPlayerIdx + 4) % 4;
    const handEl = document.getElementById(`hand-${relativeIdx}`);
    if (!handEl) continue;

    handEl.innerHTML = ''; // Limpa a mão para evitar duplicação/empilhamento
    const isLocal = (i === myPlayerIdx);
    const handData = STATE.hands[i] || [];

    handData.forEach((tile, idx) => {
      const tEl = document.createElement('div');
      tEl.className = 'tile';
      if (isLocal) tEl.id = `my-tile-${idx}`;

      // Se for o jogador local ou fim de jogo, mostra os pontos
      if (isLocal || showAll) {
        if (tile[0] === tile[1]) tEl.classList.add('double');
        tEl.innerHTML = `
          <div class="tile-half">${getPips(tile[0])}</div>
          <div class="tile-half">${getPips(tile[1])}</div>
        `;
      } else {
        // Para oponentes, mostra as costas da peça
        tEl.classList.add('tile-back');
      }
      handEl.appendChild(tEl);
    });
  }
}

function renderBoardFromState() {
  const container = document.getElementById('snake');
  if (!container) return;
  container.innerHTML = ''; 

  STATE.positions.forEach(p => {
    const tileEl = document.createElement('div');
    tileEl.className = `tile ${p.v1 === p.v2 ? 'double' : ''}`;
    
    // Posicionamento absoluto na mesa
    tileEl.style.left = `calc(50% + ${p.x}px)`;
    tileEl.style.top = `calc(50% + ${p.y}px)`;
    tileEl.style.transform = `translate(-50%, -50%) rotate(${p.rot}deg) scale(${window.currentSnakeScale || 1})`;
    
    tileEl.innerHTML = `
      <div class="tile-half">${getPips(p.v1)}</div>
      <div class="tile-half">${getPips(p.v2)}</div>
    `;
    container.appendChild(tileEl);
  });
}

function updateScoreDisplay() {
  const sA = document.getElementById('scoreA');
  const sB = document.getElementById('scoreB');
  if (sA) sA.textContent = STATE.scores[0];
  if (sB) sB.textContent = STATE.scores[1];
}

function updateStatus(text, cls = '') {
  const el = document.getElementById('game-status');
  if (el) {
    el.innerText = text;
    el.className = cls;
  }
}
