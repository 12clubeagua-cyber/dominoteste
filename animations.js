/* 
   ANIMACOES E CAMERA (animations.js)
 */

// Função que cria a animação de embaralhar as peças antes de iniciar uma rodada
function runShuffleAnimation(cb) {
  // Busca o elemento do tabuleiro principal (onde a 'cobra' de dominós é montada)
  const snake = document.getElementById('snake');
  // Se o tabuleiro não existir no HTML, interrompe a animação
  if (!snake) {
      // Se houver uma função de callback (para continuar o jogo), chama ela e sai
      if (cb) cb();
      return;
  }

  // Limpa animacoes ou peças anteriores do tabuleiro para iniciar limpo
  snake.innerHTML = '';

  // Define a escala inicial da câmera baseada na configuração (sem usar a trava antiga)
  const initialScale = CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3;
  // Atualiza as variáveis globais de controle de escala e posição (centro X e Y)
  window.currentSnakeScale = initialScale;
  window.currentSnakeCx = 0;
  window.currentSnakeCy = 0;
  // Aplica a escala inicial via CSS transform, mantendo o eixo X e Y no 0 (centro)
  snake.style.transform = `scale(${initialScale}) translate(0px,0px)`;

  // Lê as medidas de largura e comprimento reais do CONFIG e corta pela metade
  const halfW = (CONFIG?.GAME?.TILE_W ?? 18) / 2;
  const halfL = (CONFIG?.GAME?.TILE_L ?? 36) / 2;

  // Cria um array para guardar as peças falsas da animação de embaralhamento
  const fakes = [];
  // Loop para criar 28 peças visuais (o total do dominó)
  for (let i = 0; i < 28; i++) {
    // Cria um novo elemento de div para simular a peça
    const el = document.createElement('div');
    // Define as classes CSS (peça de dominó, virada para baixo/escondida)
    el.className = 'tile tile-v hidden';
    // NOVA LÓGICA DINÂMICA: Centraliza a peça usando metades perfeitas dos valores configurados
    el.style.cssText = `position:absolute;left:-${halfW}px;top:-${halfL}px;transition:transform .15s ease-in-out;`;
    // Chama a função para espalhar essa peça em uma posição e rotação aleatórias
    scatter(el);
    // Adiciona a peça falsa na tela (dentro do tabuleiro)
    snake.appendChild(el);
    // Guarda a referência no array para podermos manipulá-la depois
    fakes.push(el);
  }

  // Se o celular do jogador suportar vibração, faz uma pequena sequência de vibrações
  if (navigator.vibrate) navigator.vibrate([25,35,25,35,25]);
  // Variável para contar quantas vezes as peças já foram movidas (embaralhadas)
  let shuffles = 0;
  // Cria um loop temporal (intervalo) que roda a cada 150 milissegundos
  const si = setInterval(() => {
    // Para cada peça falsa, joga ela pra uma nova posição aleatória
    fakes.forEach(el => scatter(el));
    // Toca o som das peças batendo (com tom/pitch e volume levemente aleatórios)
    playClack(400 + Math.random() * 200, 0.04);
    // Incrementa o contador. Se já embaralhou 8 vezes, finaliza a animação
    if (++shuffles >= 8) {
      // Para o intervalo para não rodar mais
      clearInterval(si);
      // Remove todas as peças falsas da tela
      fakes.forEach(el => el.remove());
      // Aguarda 300ms de pausa dramática e então chama o callback para o jogo continuar
      setTimeout(() => { if (cb) cb(); }, 300);
    }
  }, 150);
}

// Função auxiliar que move e rotaciona um elemento HTML aleatoriamente
function scatter(el) {
  // Calcula uma posição X aleatória entre -60px e +60px
  const rx = (Math.random() - .5) * 120;
  // Calcula uma posição Y aleatória entre -60px e +60px
  const ry = (Math.random() - .5) * 120;
  // Calcula uma rotação aleatória de 0 a 360 graus
  const rot = Math.random() * 360;
  // Aplica essas posições e rotação no elemento via CSS
  el.style.transform = `translate(${rx}px,${ry}px) rotate(${rot}deg)`;
}

// Função responsável por animar a peça voando da mão do jogador para a mesa
function animateTile(pIdx, target, cb) {
  // Pega a referência do tabuleiro
  const boardEl = document.getElementById('snake');
  let hiddenTile = null;
  // Se o tabuleiro existir, cria um elemento invisível ("fantasma") na posição alvo
  if (boardEl) {
    hiddenTile = document.createElement('div');
    // Marca ele como temporariamente escondido
    hiddenTile.className = 'temp-hidden';
    // Salva as coordenadas X e Y onde a peça vai cair
    hiddenTile.dataset.x = target.x;
    hiddenTile.dataset.y = target.y;
    // Adiciona no tabuleiro (isso impede que renderizações paralelas dupliquem a peça)
    boardEl.appendChild(hiddenTile);
  }

  // Cria o elemento visual ("proxy") que vai fazer a animação de voo
  const proxy = document.createElement('div');
  // Define se é vertical ou horizontal dependendo do alvo
  proxy.className = `tile moving-proxy ${target.isV ? 'tile-v' : 'tile-h'}`;
  // Desenha os pontinhos (pips) da peça baseada nos valores que ela tem
  proxy.innerHTML = `<div class="half">${getPips(target.v1)}</div><div class="half">${getPips(target.v2)}</div>`;
  // Remove as transições CSS padrão, pois vamos animar usando JavaScript puro (requestAnimationFrame)
  proxy.style.transition = 'none';
  // Joga essa peça solta no body da página para ela poder sobrepor tudo
  document.body.appendChild(proxy);

  // Calcula qual mão na tela (0 a 3) corresponde ao jogador que está jogando
  const viewPos = (pIdx - (myPlayerIdx ?? 0) + 4) % 4;
  // Pega o elemento HTML dessa mão
  const handEl = document.getElementById(`hand-${viewPos}`);
  // Se a mão não existir na tela, aborta a animação e processa direto
  if (!handEl) { 
      if (hiddenTile) hiddenTile.remove(); // Limpa o fantasma
      proxy.remove(); // Remove a peça voadora
      if(cb) cb(); // Executa o callback
      return; 
  }
  
  // Pega a posição (BoundingRect) da mão do jogador na tela real (em pixels)
  const hRect = handEl.getBoundingClientRect();
  // Calcula o centro X da mão
  const startX = hRect.left + hRect.width/2;
  // Calcula o centro Y da mão
  const startY = hRect.top  + hRect.height/2;

  // Pega o contêiner do tabuleiro
  const boardContainer = document.getElementById('board-container');
  if (!boardContainer) { 
      if (hiddenTile) hiddenTile.remove();
      proxy.remove(); 
      if(cb) cb(); 
      return; 
  }
  
  // Pega a posição do tabuleiro na tela
  const bRect = boardContainer.getBoundingClientRect();
  // Calcula o centro X da tela do tabuleiro
  const bCX = bRect.left + bRect.width/2;
  // Calcula o centro Y da tela do tabuleiro
  const bCY = bRect.top  + bRect.height/2;
  
  // Recupera a escala atual da câmera
  const sc  = window.currentSnakeScale || 1;
  // Recupera o offset de câmera em X
  const cx  = window.currentSnakeCx || 0;
  // Recupera o offset de câmera em Y
  const cy  = window.currentSnakeCy || 0;
  
  // Calcula o destino final em pixels absolutos na tela (Centro da mesa + Coordenada alvo + Ajuste de câmera * Zoom)
  const destX = bCX + (target.x + cx) * sc;
  const destY = bCY + (target.y + cy) * sc;

  // Define a duração da animação (400ms) e pega o tempo exato que começou
  const dur = 400, t0 = performance.now();
  
  // Função de passo da animação (roda a cada frame da tela)
  function step(now) {
    // Calcula a porcentagem do tempo decorrido (de 0.0 a 1.0)
    const p = Math.min((now - t0) / dur, 1);
    // Aplica uma fórmula matemática de "Easing" (faz o movimento acelerar e depois frear suavemente)
    const ease = p < .5 ? 2*p*p : -1+(4-2*p)*p;
    
    // Interpola a posição X atual baseada no tempo e aplica na peça voadora
    proxy.style.left = `${startX + (destX-startX)*ease}px`;
    // Interpola a posição Y atual baseada no tempo e aplica na peça voadora
    proxy.style.top  = `${startY + (destY-startY)*ease}px`;
    // Interpola a escala (começa com zoom de 40% e vai até o zoom real do tabuleiro)
    proxy.style.transform = `translate(-50%,-50%) scale(${0.4 + (sc-0.4)*ease})`;
    
    // Se ainda não deu 100% (p < 1), pede pro navegador chamar o próximo frame
    if (p < 1) requestAnimationFrame(step);
    // Se a animação acabou:
    else {
      // Toca o barulho da peça batendo na mesa
      playClack();
      // Remove o 'temp-hidden' para que a próxima renderização oficial do tabuleiro mostre a peça final real
      if (boardEl) {
        const h = boardEl.querySelector('.temp-hidden');
        if (h) h.remove();
      }
      // Dá um tempo minúsculo de 10ms, apaga a peça voadora da tela e chama o callback do jogo
      setTimeout(() => { proxy.remove(); if(cb) cb(); }, 10);
    }
  }
  // Dispara o primeiro frame da animação
  requestAnimationFrame(step);
}

// Função que calcula o zoom dinâmico e a centralização do tabuleiro (Agora 100% Responsiva)
function updateSnakeScale() {
  // Pega a referência do tabuleiro (cobrinha) e do container visível
  const s = document.getElementById('snake');
  const b = document.getElementById('board-container');
  // Se não houver peças jogadas ou os elementos não existirem, ignora
  if (!STATE?.positions?.length || !s || !b) return;

  // Lógica dinâmica baseada no config.js
  const halfW = (CONFIG?.GAME?.TILE_W ?? 18) / 2;
  const halfL = (CONFIG?.GAME?.TILE_L ?? 36) / 2;

  // Variáveis para rastrear os limites extremos de todas as peças na mesa (Bounding Box)
  let minX=0, maxX=0, minY=0, maxY=0;
  // Itera sobre todas as peças que já foram jogadas
  STATE.positions.forEach(p => {
    // NOVA LÓGICA: Largura (w) e altura (h) agora usam as metades dinâmicas dependendo se a peça está em pé ou deitada
    const w = p.isV ? halfW : halfL;
    const h = p.isV ? halfL : halfW;
    
    // Expande os limites para garantir que a peça caiba no retângulo virtual da mesa
    minX = Math.min(minX, p.x-w); maxX = Math.max(maxX, p.x+w);
    minY = Math.min(minY, p.y-h); maxY = Math.max(maxY, p.y+h);
  });

  // Espaçamento de borda (padding) em pixels para as peças não grudarem na borda da tela
  const pad = 60;
  
  // Calcula a escala exata necessária para caber todo o tabuleiro na LARGURA atual da tela
  const scX = b.clientWidth  / ((maxX-minX) + pad || 1);
  // Calcula a escala exata necessária para caber todo o tabuleiro na ALTURA atual da tela
  const scY = b.clientHeight / ((maxY-minY) + pad || 1);
  
  // O alvo de escala é o menor valor entre X e Y (para não cortar nada). É limitado pelo Zoom Max.
  // REMOVIDA A TRAVA DE MINSCALEREACHED: Agora a escala reflete exatamente o tamanho da tela atual.
  const target = Math.min(scX, scY, CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3);

  // Calcula o centro exato entre a peça mais distante de cada lado para manter a câmera focada no meio
  const cx = -(minX+maxX)/2;
  const cy = -(minY+maxY)/2;
  
  // Aplica o zoom (target) e o deslocamento da câmera direto no estilo CSS do tabuleiro
  s.style.transform = `scale(${target}) translate(${cx}px,${cy}px)`;
  
  // Salva o zoom e o deslocamento atuais nas variáveis globais para a função `animateTile` saber o alvo correto
  window.currentSnakeScale = target;
  window.currentSnakeCx = cx;
  window.currentSnakeCy = cy;
}

// OUVINTE DE REDIMENSIONAMENTO DE TELA (Novo)
// Fica escutando se a janela do navegador mudou de tamanho (Ex: Virou o celular)
window.addEventListener('resize', () => {
  // Se o jogo já começou e tem peças na mesa, recalcula a câmera imediatamente
  if (typeof STATE !== 'undefined' && STATE?.positions?.length) {
    updateSnakeScale();
  }
});
