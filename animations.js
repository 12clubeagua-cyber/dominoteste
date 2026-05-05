/* 
   ========================================================================
   ANIMATIONS.JS - VISUAIS E DINÂMICA DE CÂMERA (VERSÃO BLINDADA)
   Gerencia o zoom responsivo, embaralhamento e movimento das peças.
   ======================================================================== 
*/

/**
 * 1. CONTROLE DE CAMERA (VIEWPORT)
 * Mantem a "cobra" de domino sempre centralizada e dentro da tela.
 */
window.updateCamera = function() {
    const snakeEl = document.getElementById('snake');
    const boardBox = document.getElementById('board-container');
    
    if (!window.STATE?.positions?.length || !snakeEl || !boardBox) {
        if (snakeEl) {
            snakeEl.style.transform = `scale(1) translate(0px, 0px)`;
            window.currentCamera = { scale: 1, x: 0, y: 0 };
        }
        return;
    }

    const tileW = window.CONFIG?.GAME?.TILE_W ?? 18;
    const tileL = window.CONFIG?.GAME?.TILE_L ?? 36;
    const tileHalfW = tileW / 2;
    const tileHalfL = tileL / 2;

    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    window.STATE.positions.forEach(p => {
        const w = p.isV ? tileHalfW : tileHalfL;
        const h = p.isV ? tileHalfL : tileHalfW;
        minX = Math.min(minX, p.x - w); 
        maxX = Math.max(maxX, p.x + w);
        minY = Math.min(minY, p.y - h); 
        maxY = Math.max(maxY, p.y + h);
    });

    const padding = 100;
    const viewW = boardBox.clientWidth;
    const viewH = boardBox.clientHeight;

    const contentW = (maxX - minX) + padding;
    const contentH = (maxY - minY) + padding;

    const scaleX = viewW / contentW;
    const scaleY = viewH / contentH;
    
    const maxScaleConfig = window.CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 1;
    const finalScale = Math.min(scaleX, scaleY, maxScaleConfig);

    const offsetX = -(minX + maxX) / 2;
    const offsetY = -(minY + maxY) / 2;
    
    // Define variaveis CSS para a animacao de shake usar os valores atuais
    document.documentElement.style.setProperty('--cam-scale', finalScale);
    document.documentElement.style.setProperty('--cam-x', `${offsetX}px`);
    document.documentElement.style.setProperty('--cam-y', `${offsetY}px`);

    snakeEl.style.transform = `scale(${finalScale}) translate(${offsetX}px, ${offsetY}px)`;
    
    window.currentCamera = {
        scale: finalScale,
        x: offsetX,
        y: offsetY
    };
};

window.screenShake = function() {
    const snakeEl = document.getElementById('snake');
    if (!snakeEl) return;
    snakeEl.classList.remove('shake');
    void snakeEl.offsetWidth; // Force reflow
    snakeEl.classList.add('shake');
    setTimeout(() => snakeEl.classList.remove('shake'), 250);
};

/**
 * 2. ANIMAÇÕES DE PREPARAÇÃO (SHUFFLE)
 */
window.runShuffleAnimation = function(onComplete) {
    const snake = document.getElementById('snake');
    if (!snake) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    snake.innerHTML = '';
    const initialScale = window.CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 1;
    snake.style.transform = `scale(${initialScale}) translate(0,0)`;
    window.currentCamera = { scale: initialScale, x: 0, y: 0 };

    const fakes = [];
    // Cria 28 peças falsas para a animação
    for (let i = 0; i < 28; i++) {
        const el = document.createElement('div');
        el.className = 'tile tile-v hidden';
        // Estilo inline crítico: as peças devem começar absolutamente no centro antes do scatter
        el.style.cssText = `position:absolute; left:50%; top:50%; margin-left:-9px; margin-top:-18px; transition:transform 0.2s ease-out; z-index:10;`;
        window.applyScatter(el);
        snake.appendChild(el);
        fakes.push(el);
    }

    // Feedback tátil em dispositivos móveis
    if (navigator.vibrate) {
        try { navigator.vibrate([10, 20, 10]); } catch (e) { /* Ignora se bloqueado */ }
    }

    let count = 0;
    const interval = setInterval(() => {
        fakes.forEach(el => window.applyScatter(el));
        
        // Efeito sonoro aleatório simulando peças batendo
        if (typeof window.playClack === 'function') {
            window.playClack(400 + Math.random() * 200, 0.05);
        }
        
        if (++count >= 6) { // Após 6 movimentos, a animação termina
            clearInterval(interval);
            
            // Inicia o fade out das peças falsas
            fakes.forEach(el => {
                el.style.opacity = '0';
                el.style.transform += ' scale(0)';
            });
            
            // Aguarda o fade out antes de chamar o callback (distribuição real)
            setTimeout(() => {
                fakes.forEach(el => el.remove());
                if (typeof onComplete === 'function') onComplete();
            }, 300);
        }
    }, 150);
};

/**
 * Função utilitária global para jogar peças falsas em posições aleatórias
 */
window.applyScatter = function(el) {
    const range = 180;
    const rx = (Math.random() - 0.5) * range;
    const ry = (Math.random() - 0.5) * range;
    const rot = Math.random() * 360;
    el.style.transform = `translate(${rx}px, ${ry}px) rotate(${rot}deg)`;
};

/**
 * 3. ANIMAÇÕES DE JOGADA (FLYING TILES)
 * Move a peça da mão do jogador até a posição exata na mesa.
 */
window.animateTile = function(pIdx, targetData, onComplete) {
    const snakeEl = document.getElementById('snake');
    const containerEl = document.getElementById('board-container');
    
    // Se a interface falhar, aplica a jogada instantaneamente
    if (!snakeEl || !containerEl || !targetData) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    // Cria a peça 'fantasma' que fará o trajeto visual
    const proxy = document.createElement('div');
    proxy.className = `tile moving-proxy ${targetData.isV ? 'tile-v' : 'tile-h'}`;
    proxy.style.cssText = `z-index: 9999; position: fixed; pointer-events: none;`;
    
    // Preenche a peça fantasma com os pontos de forma segura
    let pipsHTML = "";
    if (typeof window.Renderer !== 'undefined' && typeof window.Renderer._getPips === 'function') {
        pipsHTML = `<div class="half">${window.Renderer._getPips(targetData.v1)}</div><div class="half">${window.Renderer._getPips(targetData.v2)}</div>`;
    } else if (typeof window.getPips === 'function') {
        pipsHTML = `<div class="half">${window.getPips(targetData.v1)}</div><div class="half">${window.getPips(targetData.v2)}</div>`;
    }
    proxy.innerHTML = pipsHTML;
    document.body.appendChild(proxy);

    // 1. Define o PONTO DE PARTIDA (Mão do Jogador)
    const localIdx = window.myPlayerIdx ?? 0;
    const viewIdx = (pIdx - localIdx + 4) % 4; // Qual mão na tela representa esse jogador?
    const handEl = document.getElementById(`hand-${viewIdx}`);
    
    // Se a mão não for encontrada, parte do centro da tela
    const hRect = handEl ? handEl.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
    const startX = hRect.left + (hRect.width / 2);
    const startY = hRect.top + (hRect.height / 2);

    // 2. Define o PONTO DE CHEGADA (Posição lógica traduzida para pixel e escala)
    const cRect = containerEl.getBoundingClientRect();
    const cam = window.currentCamera || { scale: 1, x: 0, y: 0 };
    
    // A mágica matemática: converte a posição lógica para a física atual da câmera
    const destX = (cRect.left + (cRect.width / 2)) + ((targetData.x + cam.x) * cam.scale);
    const destY = (cRect.top + (cRect.height / 2))  + ((targetData.y + cam.y) * cam.scale);

    const startTime = performance.now();
    const duration = 500; // Tempo de voo em ms

    // Motor de interpolação frame a frame
    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        // Easing: Cubic Out (começa rápido, termina suave)
        const ease = 1 - Math.pow(1 - t, 3); 
        
        const curX = startX + (destX - startX) * ease;
        const curY = startY + (destY - startY) * ease;
        const curScale = 1 + (cam.scale - 1) * ease; // A peça encolhe/cresce durante o voo

        proxy.style.left = `${curX}px`;
        proxy.style.top = `${curY}px`;
        proxy.style.transform = `translate(-50%, -50%) scale(${curScale})`;

        if (t < 1) {
            requestAnimationFrame(step); // Continua a animação
        } else {
            // Animação terminou
            if (typeof window.playClack === 'function') window.playClack(); // Som de batida
            
            // É crucial chamar o onComplete (que desenha a peça real) ANTES de remover o proxy
            if (typeof onComplete === 'function') onComplete();
            
            // Remove o fantasma no próximo frame para evitar flicker (piscada)
            requestAnimationFrame(() => proxy.remove());
        }
    }
    
    requestAnimationFrame(step); // Inicia o voo
};