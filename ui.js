/* 
   INTERFACE VISUAL (ui.js)
 */

// Função responsável por atualizar os números do placar e os nomes das equipes no cabeçalho
function updateScoreDisplay() {
  // Busca os elementos HTML onde os números dos placares ficam
  const scoreA = document.getElementById('scoreA');
  const scoreB = document.getElementById('scoreB');
  // Busca os elementos HTML onde os textos ("Sua Dupla", "Oponentes") ficam
  const labelA = document.getElementById('label-team-a');
  const labelB = document.getElementById('label-team-b');
  // Se algum desses elementos não existir na tela, aborta a função para não dar erro
  if (!scoreA || !scoreB || !labelA || !labelB) return;

  // Atualiza o texto visual do placar A com a pontuação do Time 0 guardada no Estado
  scoreA.textContent = STATE.scores[0];
  // Atualiza o texto visual do placar B com a pontuação do Time 1
  scoreB.textContent = STATE.scores[1];
  
  // Se o Time 0 tiver mais pontos, adiciona a classe 'winning' no placar A (para pintar de verde). Se não, remove.
  scoreA.classList.toggle('winning', STATE.scores[0] > STATE.scores[1]);
  // Faz o mesmo para o placar B se o Time 1 estiver ganhando
  scoreB.classList.toggle('winning', STATE.scores[1] > STATE.scores[0]);

  // Define os rótulos baseado em quem você é. Se você é o 1 ou 3 (Ímpares/Time 1), o Time 0 (A) é o oponente. 
  // Se você for o 0 ou 2 (Pares/Time 0), o Time 0 (A) é a sua equipe.
  const teamLabels = (myPlayerIdx === 1 || myPlayerIdx === 3) ? ["Oponentes", "Sua Dupla"] : ["Sua Dupla", "Oponentes"];
  // Aplica o rótulo A
  labelA.innerText = teamLabels[0];
  // Aplica o rótulo B
  labelB.innerText = teamLabels[1];
}

// Função para o jogador escolher ou alterar o próprio apelido
function changeName() {
  let name = "";
  let valid = false;

  // Fica num loop ("insistindo") até que o usuário digite um nome válido ou cancele
  while (!valid) {
    // Abre uma janela nativa do navegador pedindo para digitar
    const input = prompt("Digite seu apelido (ate 10 letras, apenas A-Z):", "SEUNOME");
    // Se o usuário clicar em "Cancelar", a função é interrompida
    if (input === null) return; 

    // Remove espaços vazios do começo/fim e transforma tudo em maiúsculas
    const cleaned = input.trim().toUpperCase();
    // Validação usando REGEX: Verifica se tem de 1 a 10 letras e se contém APENAS letras de A a Z
    if (cleaned.length > 0 && cleaned.length <= 10 && /^[A-Z]+$/.test(cleaned)) {
      name = cleaned; // Salva o nome válido
      valid = true; // Quebra o loop
    } else {
      // Se digitou números, símbolos ou passou de 10 letras, avisa o erro (o loop vai pedir de novo)
      alert("Nome invalido. Use apenas letras (A-Z), entre 1 e 10 caracteres.");
    }
  }

  // Atualiza o nome do jogador principal (índice 0) no Gerenciador de Nomes
  NameManager.set(0, name);
  // Como o nome mudou, atualiza a tela (útil se o nome aparecer no placar em versões futuras)
  updateScoreDisplay();
}

// Função executada quando o jogo carrega pela primeira vez
function checkAndPromptName() {
    // Verifica se não há um nome salvo na memória do navegador (localStorage)
    if (!localStorage.getItem('userName')) {
        // Se não tiver, obriga o jogador a escolher um apelido abrindo a função acima
        changeName();
    }
}

// Função que aciona a animação de "Passar a vez" (Mão do jogador fica cinza e com um X)
function triggerPassVisual(pIdx) {
    // Se a variável global que controla quem está "piscando de passe" não existir, cria ela
    if (!window.visualPass) window.visualPass = [false, false, false, false];
    
    // Marca que o jogador específico (pIdx) acabou de passar a vez
    window.visualPass[pIdx] = true;
    // Força a tela a se redesenhar para que a mão dele aplique o visual de 'passado'
    renderHands(STATE.isOver); 
    
    // Cria um temporizador que espera o tempo definido na configuração (PASS_DISPLAY_TIME)
    setTimeout(() => {
        // Desmarca a flag do jogador
        window.visualPass[pIdx] = false;
        // Redesenha a tela para que a mão volte à cor normal
        renderHands(STATE.isOver); 
    }, CONFIG?.GAME?.PASS_DISPLAY_TIME ?? 1500);
}

// Função para atualizar a barra de status central (Sincroniza com a rede se for o Host)
function updateStatus(text, cls = '') {
  // Atualiza a barra de status localmente
  updateStatusLocal(text, cls);
  // Se for o dono da sala, envia o mesmo texto para os celulares dos clientes exibirem
  if (netMode === 'host') broadcastToClients({ type: 'status', text, cls });
}

// Função que altera o texto da barra de status na tela do jogador
function updateStatusLocal(text, cls) {
  // Busca o elemento da barra de status
  const el = document.getElementById('game-status');
  if (!el) return;
  
  let displayMsg = text;
  // Pega todos os nomes de quem está na partida
  const allNames = NameManager.getAll();
  // Analisa as chaves (índices 0, 1, 2, 3)
  Object.keys(allNames).forEach(idx => {
      // Cria o termo genérico baseado no índice (Ex: "JOGADOR 1" para o índice 0)
      const genericName = `JOGADOR ${parseInt(idx) + 1}`;
      // Se a mensagem enviada pelo sistema contiver esse termo genérico
      if (displayMsg.includes(genericName)) {
          // Substitui "JOGADOR 1" por "VOCE" se o índice for o do próprio celular, ou pelo apelido real do amigo
          displayMsg = displayMsg.replace(genericName, (parseInt(idx) === myPlayerIdx ? "VOCE" : allNames[idx]));
      }
  });
  
  // Aplica o texto formatado na tela
  el.innerText = displayMsg;
  // Adiciona classes CSS ('active' fica dourado, 'pass' fica vermelho) para dar cor à mensagem dependendo da palavra chave
  el.className = (cls === 'active' || displayMsg.includes('PASSA') || displayMsg.includes('PASSOU')) ? cls : '';
}

// Função que lê onde as peças devem estar e as desenha na "mesa"
function renderBoardFromState() {
  // Busca a 'cobra' do tabuleiro
  const s = document.getElementById('snake');
  if (!s) return;
  
  // Converte os elementos (peças) que estão dentro da mesa num Array real do JavaScript
  const children = Array.from(s.children);
  // Para cada peça já desenhada
  children.forEach(child => {
      // Se a peça NÃO for o "fantasma" invisível de uma animação que está acontecendo agora, apaga ela
      // Isso limpa a mesa toda vez antes de desenhar tudo de novo fresquinho do banco de dados
      if (!child.classList.contains('temp-hidden')) child.remove();
  });
  
  // Pega as medidas base das peças no arquivo de configuração
  const W = CONFIG?.GAME?.TILE_W ?? 18;
  const L = CONFIG?.GAME?.TILE_L ?? 36;

  // Itera sobre a lista de posições calculadas e guardadas no Estado do jogo
  STATE.positions.forEach((nP, i) => {
    // Verifica se essa peça já está voando no ar (animando) na exata mesma coordenada
    const isAlreadyAnimating = Array.from(s.children).some(child => 
        child.classList.contains('temp-hidden') && 
        parseInt(child.dataset.x) === nP.x && 
        parseInt(child.dataset.y) === nP.y
    );
    
    // Se a peça ainda está em animação, não desenha a versão estática dela na mesa para não duplicar visualmente
    if (isAlreadyAnimating) return;

    // Cria a representação HTML da peça
    const el = document.createElement('div');
    // Adiciona a classe base e define se é em pé (tile-v) ou deitada (tile-h)
    el.className = `tile ${nP.isV ? 'tile-v' : 'tile-h'}`;
    
    // O logic.js calcula a posição do CENTRO da peça, mas o CSS posiciona pela ponta superior-esquerda
    // Por isso precisamos do "offsetX" e "offsetY" para puxar a peça metade do tamanho pra trás
    const offsetX = nP.isV ? (W / 2) : (L / 2);
    const offsetY = nP.isV ? (L / 2) : (W / 2);

    // Aplica a posição final no CSS (Coordenada Central - Metade do Tamanho)
    el.style.left = (nP.x - offsetX) + 'px';
    el.style.top  = (nP.y - offsetY) + 'px';
    
    // Desenha os furinhos das duas metades
    el.innerHTML = `<div class="half">${getPips(nP.v1)}</div><div class="half">${getPips(nP.v2)}</div>`;
    // Se esta for a última peça do array e o jogo não acabou, dá um brilho especial nela (borda dourada)
    if (i === STATE.positions.length - 1 && !STATE.isOver) el.classList.add('last-move');
    // Adiciona a peça finalizada dentro do tabuleiro
    s.appendChild(el);
  });
}

// Função que desenha as 4 mãos de peças na tela
function renderHands(reveal = false) {
  // ESCONDER O MENU DE CIMA/BAIXO (Segurança para não deixar botões presos na tela na mudança de turno)
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  // Loop para apagar todas as peças de todas as mãos na tela para desenhar do zero
  for (let i = 0; i < 4; i++) {
    // A matemática `(i - myPlayerIdx + 4) % 4` é o "Mapeamento de Câmera". 
    // Garante que o jogador local (myPlayerIdx) sempre seja desenhado na posição 0 (base da tela)
    const c = document.getElementById(`hand-${(i - myPlayerIdx + 4) % 4}`);
    if (c) c.innerHTML = '';
  }

  // Segundo loop: agora para desenhar o conteúdo dentro de cada mão
  for (let i = 0; i < 4; i++) {
    const viewPos = (i - myPlayerIdx + 4) % 4; // Descobre se essa pessoa fica embaixo(0), esq(1), topo(2) ou dir(3)
    const isSide = (viewPos === 1 || viewPos === 3); // Identifica se é oponente da lateral
    const c = document.getElementById(`hand-${viewPos}`);
    if (!c) continue;
    
    // Verifica se esse jogador está no meio da animação de "Passou a vez"
    const isBlinking = window.visualPass && window.visualPass[i];
    
    // Adiciona as classes CSS da mão: 
    // 'hand-side' se for oponente lateral.
    // 'active-turn' (brilho verde) se for a vez desse cara E a mesa não tá bloqueada.
    // 'hand-passed' (cinza) se ele passou a vez
    c.className = `hand ${isSide ? 'hand-side' : ''} ${i === STATE.current && !STATE.isOver && !STATE.isBlocked ? 'active-turn' : ''} ${isBlinking ? 'hand-passed' : ''}`;
    
    // Cria um pontinho verde indicativo de turno (Se não existir)
    if (!c.querySelector('.turn-indicator')) {
        const ind = document.createElement('div');
        ind.className = 'turn-indicator';
        c.appendChild(ind);
    }

    // Cria e exibe a etiqueta com o apelido do jogador acima da mão dele
    const nameEl = document.createElement('div');
    nameEl.className = 'player-name-label';
    nameEl.innerText = NameManager.get((myPlayerIdx + viewPos) % 4);
    c.appendChild(nameEl);

    // Cria a "caixa" invisível que segura as peças fisicamente
    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-row';
    c.appendChild(tilesContainer);

    // Verifica se o índice que está sendo desenhado é a SUA mão
    const isMyHand = (i === myPlayerIdx);
    
    // Se for a sua mão OU se o round acabou (reveal=true força abrir todas as peças pra geral ver)
    if (isMyHand || reveal) {
      // Pega o array com as suas peças e desenha uma a uma
      (STATE.hands[i] || []).forEach((t, idx) => {
        const el = document.createElement('div');
        // 'tile-rel' faz as peças não flutuarem, obedecendo a linha. Peças de quem tá do lado são desenhadas em pé.
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} ${t[0] === t[1] ? 'tile-double' : ''}`;
        el.innerHTML = `<div class="half">${getPips(t[0])}</div><div class="half">${getPips(t[1])}</div>`;
        // Se for a sua mão, coloca um ID na pedra pra que a função `input.js` possa colocar clique nela
        if (isMyHand) el.id = `my-tile-${idx}`;
        tilesContainer.appendChild(el);
      });
    } else {
      // Se NÃO for a sua mão e o jogo estiver rolando, desenha o verso das peças escondidas
      const count = STATE.handSize[i] || 0;
      for (let k = 0; k < count; k++) {
        const el = document.createElement('div');
        // Adiciona a classe 'hidden' que pinta a pedra de verde liso sem números
        el.className = `tile tile-rel ${isSide ? 'tile-v' : 'tile-h'} hidden`;
        el.innerHTML = `<div class="half"></div><div class="half"></div>`;
        tilesContainer.appendChild(el);
      }
    }
    
    // Pega o total de peças que o jogador ainda tem
    const displayCount = (i === myPlayerIdx) ? (STATE.hands[i]?.length || 0) : (STATE.handSize[i] || 0);
    // Se ele ainda tem peças e o jogo não acabou, exibe um "balãozinho" com o número escrito no canto da mão
    if (displayCount > 0 && !STATE.isOver) {
      const ind = document.createElement('div');
      ind.className = 'hand-indicators';
      const badge = document.createElement('div');
      badge.className = 'tile-count';
      badge.innerText = displayCount;
      ind.appendChild(badge);
      // Se ele passou a vez, desenha um "X" perto do número
      if (isBlinking) {
        const x = document.createElement('div');
        x.className = 'pass-x'; x.innerText = '';
        ind.appendChild(x);
      }
      c.appendChild(ind);
    }
  }
  // Após terminar de desenhar as mãos, se for a vez do usuário local e a mesa estiver liberada
  if (STATE.current === myPlayerIdx && !STATE.isOver && !STATE.isBlocked) {
     // Garante que tá destravado
     STATE.isBlocked = false;
     // Pega as jogadas possíveis
     const moves = getMoves(STATE.hands[myPlayerIdx]);
     // Se tiver o que jogar, chama o input.js para destacar as peças e liberar o clique
     if (moves.length > 0) highlight(moves);
  }
}

// Função que cria a tela visual e o contador quando uma rodada acaba
function executeEndRoundUI(winTeam, idx, msg) {
  // O 'true' vira todas as peças fechadas pra cima pra todo mundo ver quem ficou com a bucha
  renderHands(true);
  // Atualiza o placar superior com o ponto novo
  updateScoreDisplay();
  
  // Se o time 0 ou 1 ganhou, toca o som da vitória
  if (winTeam === 0 || winTeam === 1) playVictory();
  
  // Se teve um time vencedor (Não foi empate por pontos de tranca)
  if (winTeam === 0 || winTeam === 1) {
    // Define as duplas
    const teamA = [0, 2], teamB = [1, 3];
    // Pega o array do time vencedor e aplica a classe 'hand-win-blink' nas mãos deles pra piscarem
    (winTeam === 0 ? teamA : teamB).forEach(pIdx => {
        const handEl = document.getElementById(`hand-${(pIdx - myPlayerIdx + 4) % 4}`);
        if (handEl) handEl.classList.add('hand-win-blink');
    });
  }

  // Checa se o jogo inteiro acabou (alguém atingiu a meta de pontos)
  const isMatchOver = STATE.matchOver || STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore;
  
  // Se o JOGO acabou
  if (isMatchOver) {
    STATE.matchOver = true; // Sela o caixão do estado
    if (netMode === 'host') broadcastState(); // Host avisa que cabô pra geral
    // Checa se o seu time fez os pontos da vitória
    const isMyTeamWinner = (STATE.scores[0] >= STATE.targetScore) ? (myPlayerIdx % 2 === 0) : (myPlayerIdx % 2 === 1);
    // Exibe campeão final na barra
    updateStatusLocal(`${isMyTeamWinner ? "SUA DUPLA E CAMPEAO!" : "OPONENTES SAO CAMPEOES!"} Placar: ${STATE.scores[0]} x ${STATE.scores[1]}`, 'active');
    // Força a tela a recarregar pro menu inicial depois de uns segundos (Fim do jogo)
    setTimeout(() => window.location.reload(), 6000);
    
  // Se o jogo NÃO acabou e foi só o round
  } else {
    // Limpa relógios antigos
    if (STATE.autoNextInterval) clearInterval(STATE.autoNextInterval);
    // Pega o tempo em segundos que a tela de resultado deve ficar (7s)
    let timeLeft = CONFIG?.GAME?.RESULT_DISPLAY_TIME ?? 7;
    
    // Atualiza a barra de status com o título da vitória e o cronômetro
    updateStatusLocal(`${msg} (Proxima em ${timeLeft}s)`, 'active');
    
    // Cria um intervalo que roda a cada 1000ms (1 segundo)
    STATE.autoNextInterval = setInterval(() => {
        timeLeft--; // Subtrai 1 segundo
        if (timeLeft > 0) {
             // Enquanto for maior que zero, só atualiza o texto do cronômetro na barra
             updateStatusLocal(`${msg} (Proxima em ${timeLeft}s)`, 'active');
        } else {
            // Quando zerar, para o relógio
            clearInterval(STATE.autoNextInterval);
            // E chama a função do game.js para embaralhar a próxima partida
            if (typeof startRound === 'function') startRound();
        }
    }, 1000);
  }
}

// Botão de "Sair" na mesa
function exitGame() {
  // Abre um popup do navegador perguntando se tem certeza
  if (confirm("Deseja mesmo sair da partida?")) {
      // Se sim, direciona o navegador para a página limpa (sem nada depois da barra), reiniciando o app
      window.location.href = window.location.origin + window.location.pathname;
  }
}

// EVENTO DE INICIALIZAÇÃO
// Assim que a página HTML terminar de carregar (DOMContentLoaded), isso roda sozinho
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário tem nome, se não, pede.
    checkAndPromptName();
});

// Função para injetar os tamanhos do config.js no CSS dinamicamente (Explicado no bloco anterior)
function applyDynamicCSS() {
    // Lê os valores da configuração
    const width = CONFIG?.GAME?.TILE_W ?? 18;
    const height = CONFIG?.GAME?.TILE_L ?? 36;
    
    // Envia os valores para as variáveis globais do CSS
    document.documentElement.style.setProperty('--tile-width', `${width}px`);
    document.documentElement.style.setProperty('--tile-height', `${height}px`);
}

// Dispara a função assim que o arquivo é lido, aplicando o tamanho correto nas peças do CSS logo de cara
applyDynamicCSS();
