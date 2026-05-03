/* 
   ANIMACOES E CAMERA (animations.js)
 */

function runShuffleAnimation(cb) {
  const snake = document.getElementById('snake');
  if (!snake) {
      if (cb) cb();
      return;
  }

  // Limpa animacoes anteriores caso existam
  snake.innerHTML = '';

  window.minScaleReached = CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3;
  window.currentSnakeScale = window.minScaleReached;
  window.currentSnakeCx = 0;
  window.currentSnakeCy = 0;
  snake.style.transform = `scale(${window.minScaleReached}) translate(0px,0px)`;

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
      // Remove elementos de animacao
      fakes.forEach(el => el.remove());
      setTimeout(() => { if (cb) cb(); }, 300);
    }
  }, 150);
}
function scatter(el) {
  const rx = (Math.random() - .5) * 120;
  const ry = (Math.random() - .5) * 120;
  const rot = Math.random() * 360;
  el.style.transform = `translate(${rx}px,${ry}px) rotate(${rot}deg)`;
}

function animateTile(pIdx, target, cb) {
  // Adiciona o tile ao board como 'temp-hidden' para que o renderBoardFromState o ignore
  const boardEl = document.getElementById('snake');
  let hiddenTile = null;
  if (boardEl) {
    hiddenTile = document.createElement('div');
    hiddenTile.className = 'temp-hidden';
    hiddenTile.dataset.x = target.x;
    hiddenTile.dataset.y = target.y;
    boardEl.appendChild(hiddenTile);
  }

  const proxy = document.createElement('div');
  proxy.className = `tile moving-proxy ${target.isV ? 'tile-v' : 'tile-h'}`;
  proxy.innerHTML = `<div class="half">${getPips(target.v1)}</div><div class="half">${getPips(target.v2)}</div>`;
  proxy.style.transition = 'none';
  document.body.appendChild(proxy);

  const viewPos = (pIdx - (myPlayerIdx ?? 0) + 4) % 4;
  const handEl = document.getElementById(`hand-${viewPos}`);
  if (!handEl) { 
      if (hiddenTile) hiddenTile.remove();
      proxy.remove(); 
      if(cb) cb(); 
      return; 
  }
  
  const hRect = handEl.getBoundingClientRect();
  const startX = hRect.left + hRect.width/2;
  const startY = hRect.top  + hRect.height/2;

  const boardContainer = document.getElementById('board-container');
  if (!boardContainer) { 
      if (hiddenTile) hiddenTile.remove();
      proxy.remove(); 
      if(cb) cb(); 
      return; 
  }
  
  const bRect = boardContainer.getBoundingClientRect();
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
      // Remove o tile 'temp-hidden' antes de executar o cb (que chama renderBoardFromState)
      if (boardEl) {
        const h = boardEl.querySelector('.temp-hidden');
        if (h) h.remove();
      }
      setTimeout(() => { proxy.remove(); if(cb) cb(); }, 10);
    }
  }
  requestAnimationFrame(step);
}

function updateSnakeScale() {
  const s = document.getElementById('snake');
  const b = document.getElementById('board-container');
  if (!STATE?.positions?.length || !s || !b) return;

  let minX=0, maxX=0, minY=0, maxY=0;
  STATE.positions.forEach(p => {
    const w = p.isV ? 9 : 18, h = p.isV ? 18 : 9;
    minX = Math.min(minX, p.x-w); maxX = Math.max(maxX, p.x+w);
    minY = Math.min(minY, p.y-h); maxY = Math.max(maxY, p.y+h);
  });

  const pad = 60;
  const scX = b.clientWidth  / ((maxX-minX) + pad || 1);
  const scY = b.clientHeight / ((maxY-minY) + pad || 1);
  const target = Math.min(scX, scY, CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3);

  if (target < window.minScaleReached) window.minScaleReached = target;

  const cx = -(minX+maxX)/2;
  const cy = -(minY+maxY)/2;
  s.style.transform = `scale(${window.minScaleReached}) translate(${cx}px,${cy}px)`;
  window.currentSnakeScale = window.minScaleReached;
  window.currentSnakeCx = cx;
  window.currentSnakeCy = cy;
}


