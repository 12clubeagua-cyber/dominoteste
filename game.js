/* 
   FLUXO DE JOGO (game.js)
 */

// Variável que guarda quantas vezes o jogo tentou reprocessar o turno se a mão do jogador não carregou
let turnRetryCount = 0;
// Limite máximo de tentativas para evitar que o código fique preso em um loop infinito
const MAX_TURN_RETRIES = 10;

// Função que prepara o ambiente para iniciar uma nova rodada
function startRound() {
  // Define que o jogo não terminou
  STATE.isOver = false;
  // Bloqueia a interação dos jogadores durante a animação inicial
  STATE.isBlocked = true;
  // Marca que as peças estão sendo embaralhadas
  STATE.isShuffling = true;
  // Limpa a memória dos bots (e sistema) sobre os números que os jogadores "passaram"
  STATE.playerMemory = [[], [], [], []];
  // Zera o contador de "passou a vez" seguidos da mesa
  STATE.passCount = 0;
  // Reseta o status de "passou a vez" individual de cada jogador
  STATE.playerPassed = [false, false, false, false];
  // Limpa o registro de quem foi o último a jogar uma peça
  STATE.lastPlayed = null;

  // Esconde o painel de resultados (caso tenha ficado aberto da rodada anterior)
  const resArea = document.getElementById('result-area');
  if (resArea) resArea.style.display = 'none';

  // Garante que o menu de escolher o lado da mesa para jogar uma peça não apareça na tela
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  // Remove o efeito visual de "piscar" (indicando vitória) de todas as mãos na tela
  for (let v = 0; v < 4; v++) {
    const el = document.getElementById(`hand-${v}`);
    if (el) el.classList.remove('hand-win-blink');
  }

  // Se este jogador for o dono da sala, avisa os outros computadores para tocarem a animação de embaralhar
  if (netMode === 'host') broadcastToClients({ type: 'shuffle_start' });

  // Toca a animação visual e depois executa a função dealAndStart para distribuir as peças
  runShuffleAnimation(() => dealAndStart());
}

// Função que distribui as peças do dominó e dá início efetivo à rodada
function dealAndStart() {
  // Limpa o tabuleiro visual ("cobra") de todas as peças velhas
  const s = document.getElementById('snake');
  if (s) s.innerHTML = '';

  // Reseta a escala (zoom) da câmera pro valor padrão definido nas configurações
  window.minScaleReached = CONFIG?.GAME?.SNAKE_MAX_SCALE ?? 0.3;
  window.currentSnakeScale = window.minScaleReached;

  // Cria um baralho vazio (array) para as 28 peças de dominó
  const deck = [];
  // Usa dois loops (um dentro do outro) para criar todas as combinações de números de 0 a 6
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) deck.push([i, j]);
  // Embaralha o array aleatoriamente subtraindo valores
  deck.sort(() => Math.random() - .5);

  // Remove grupos de 7 peças do baralho e os entrega para os 4 jogadores (formando as mãos)
  STATE.hands = [deck.splice(0, 7), deck.splice(0, 7), deck.splice(0, 7), deck.splice(0, 7)];
  // Grava o tamanho inicial de todas as mãos
  STATE.handSize = [7, 7, 7, 7];
  // Zera o array de posições (peças na mesa)
  STATE.positions = [];
  // Zera as "pontas" disponíveis na mesa
  STATE.extremes = [null, null];
  // Reseta os dados que controlam a direção que a cobra do dominó vai crescer na mesa
  STATE.ends = [
    { hscX: 0, hscY: 0, dir: 270, lineCount: 1, lastVDir: 270, wasDouble: false },
    { hscX: 0, hscY: 0, dir: 90,  lineCount: 1, lastVDir: 90,  wasDouble: false },
  ];

  // Regra de quem começa jogando:
  // Se já teve um vencedor na rodada passada, ele começa esta nova rodada
  if (STATE.roundWinner !== null) {
    STATE.current = STATE.roundWinner;
  } else {
    // Se for a primeira rodada do jogo, assume que o Jogador 0 começará
    STATE.current = 0;
    // Olha as mãos de todos os jogadores para procurar quem tirou o duplo sena (bucha de 6)
    STATE.hands.forEach((h, i) => h.forEach(t => {
      // Quem tiver a peça [6,6], ganha o direito de ser o primeiro a jogar
      if (t[0] === 6 && t[1] === 6) STATE.current = i;
    }));
  }

  // Confirma que a rodada não acabou, destranca a mesa e sinaliza que o embaralhamento terminou
  STATE.isOver = false;
  STATE.isBlocked = false;
  STATE.isShuffling = false;

  // Se for o dono da sala, manda todo esse estado novo para os clientes conectados
  if (netMode === 'host') broadcastState();
  
  // Desenha as peças na tela do jogador
  renderHands();
  // Desenha a mesa (que no momento estará vazia)
  renderBoardFromState();
  
  // Espera um tempo (baseado na config) para os jogadores se prepararem e então inicia o turno
  setTimeout(() => processTurn(), CONFIG?.GAME?.START_DELAY ?? 1);
}

// Função principal que analisa de quem é a vez e o que pode ser feito
function processTurn() {
  // Se a rodada acabou, interrompe e não processa nada
  if (STATE.isOver) return;

  // Destranca o jogo para permitir que a ação aconteça
  STATE.isBlocked = false;

  // Pega o índice do jogador atual
  const cur = STATE.current;

  // Verificação de falha: Se a mão de peças do jogador atual não carregou no sistema
  if (!STATE.hands[cur]) {
    // Incrementa a contagem de tentativas
    turnRetryCount++;
    // Se excedeu o limite máximo de tentativas
    if (turnRetryCount >= MAX_TURN_RETRIES) {
        // Cria uma mão vazia falsa para evitar que o código quebre completamente
        STATE.hands[cur] = [];
        turnRetryCount = 0;
    }
    // Espera um pouco e tenta processar o turno novamente
    setTimeout(processTurn, 500);
    return;
  }
  // Se deu tudo certo, zera as tentativas de falha
  turnRetryCount = 0;

  // Avalia todas as peças na mão do jogador e descobre quais podem ser jogadas legalmente
  const moves = getMoves(STATE.hands[cur]);
  
  // Define se quem deve jogar é uma pessoa real clicando, ou se o computador deve jogar sozinho
  let isHuman = false;
  // Se jogando sem internet, é humano apenas se for o índice local do aparelho
  if (netMode === 'offline') {
    isHuman = (cur === myPlayerIdx);
  } else if (netMode === 'host') {
    // Se for o host, é humano se for o próprio host ou um cliente real conectado nesse índice
    isHuman = (cur === myPlayerIdx || connectedClients.some(c => c.assignedIdx === cur));
  } else if (netMode === 'client') {
    // Se for cliente e não for a vez dele, bloqueia a tela dele e avisa quem está jogando
    if (cur !== myPlayerIdx) {
      STATE.isBlocked = true;
      updateStatus(`${NameManager.get(cur)} JOGANDO...`);
      return;
    }
    // Se for a vez do cliente, ele é humano
    isHuman = true;
  }

  // Se NÃO for humano (ou seja, é um Bot controlado por IA)
  if (!isHuman) {
    // Bloqueia a tela pro jogador real não clicar em nada
    STATE.isBlocked = true;
    // Pega o nome do Bot e mostra na barra superior
    const playerName = NameManager.get(cur);
    updateStatus(`${playerName} JOGANDO...`);

    // Calcula um tempo aleatório de atraso para parecer que a IA está "pensando"
    const delay = (CONFIG?.BOT?.MIN_DELAY ?? 1) + Math.random() * ((CONFIG?.BOT?.MAX_DELAY ?? 1500) - (CONFIG?.BOT?.MIN_DELAY ?? 500));
    // Muda a barra de status para a mensagem de "PENSANDO"
    updateStatus(CONFIG?.BOT?.THINKING_MSG ?? "PENSANDO...");
    // Cancela temporizadores velhos
    clearTurnTimer();
    // Executa a ação do bot após o tempo calculado expirar
    STATE.turnTimer = setTimeout(() => {
        // Se o bot não tem jogadas possíveis, ele passa a vez
        if (moves.length === 0) doPass(cur);
        else {
            // A IA decide qual é a melhor jogada na lista de possíveis
            const move = chooseBotMove(cur, moves);
            // Se falhou em decidir (redundância de segurança), passa a vez
            if (!move) doPass(cur);
            // Senão, joga a peça selecionada no lado escolhido pela IA
            else play(cur, move.idx, move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side));
        }
    }, delay);
    // Sai da função, já que o evento futuro já foi agendado
    return;
  }

  // Se É HUMANO, mas a lista de movimentos dele for vazia (não tem a pedra pra jogar)
  if (moves.length === 0) {
    // Trava a tela
    STATE.isBlocked = true;
    // Mostra que ele não tem a pedra
    updateStatus(`${NameManager.get(cur)} NAO TEM PECA`, 'pass');
    clearTurnTimer();
    // Passa a vez automaticamente em nome do jogador depois de um tempo fixo
    STATE.turnTimer = setTimeout(() => doPass(cur), 1500);
    return;
  }

  // Se for multiplayer host e for a vez de outro humano (cliente), a gente trava o host e espera
  if (netMode === 'host' && cur !== myPlayerIdx) {
    STATE.isBlocked = true;
    updateStatus(`${NameManager.get(cur)} JOGANDO...`);
    return;
  }

  // Se for a vez DESTE usuário (humano local no celular), destranca a tela e avisa pra jogar
  STATE.isBlocked = false;
  updateStatus('SUA VEZ', 'active');
  renderHands();
  // Destaca as peças dele na tela que podem ser jogadas
  if (netMode === 'client' || netMode === 'offline' || (netMode === 'host' && cur === myPlayerIdx)) highlight(moves);
}

// Função que processa o ato de "Passar a vez"
function doPass(pIdx) {
  // Cancela se o jogo acabou
  if (STATE.isOver) return;

  // Se já houverem peças na mesa
  if (STATE.extremes[0] !== null) {
    // Registra na "memória" do sistema que este jogador não tem a pedra da ponta esquerda
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[0])) STATE.playerMemory[pIdx].push(STATE.extremes[0]);
    // Registra que não tem a pedra da ponta direita
    if (!STATE.playerMemory[pIdx].includes(STATE.extremes[1])) STATE.playerMemory[pIdx].push(STATE.extremes[1]);
  }

  // Marca este jogador específico como tendo passado na rodada atual
  STATE.playerPassed[pIdx] = true;
  // Soma +1 no contador de "passes consecutivos" da mesa
  STATE.passCount++;

  // Toca o som de erro
  playPass();
  // Exibe a animação/texto de passe na tela
  triggerPassVisual(pIdx);

  // Se for o host, manda um aviso pros clientes para eles tocarem a animação lá também
  if (netMode === 'host') broadcastToClients({ type: 'animate_pass', pIdx });

  // Regra de "Tranca": Se houveram 4 passes seguidos, ninguém tem peça e o jogo trancou
  if (STATE.passCount >= 4) {
    // Encerra a rodada com o motivo 'block' (jogo trancado)
    endRound('block', -1);
    return;
  }

  // Avança pro próximo jogador na roda (0 vira 1, 3 volta pro 0)
  STATE.current = (STATE.current + 1) % 4;
  // Sincroniza o novo estado no multiplayer
  broadcastState();

  // Prepara o relógio para iniciar a rodada do próximo após mostrar o aviso visual do passe
  clearTurnTimer();
  STATE.turnTimer = setTimeout(() => processTurn(), CONFIG?.GAME?.PASS_DISPLAY_TIME ?? 1500);
}

// Função que finaliza a rodada atual e define o vencedor
function endRound(reason, winnerIdx) {
  // Previne encerramentos múltiplos acidentais
  if (STATE.isOver) return;
  STATE.isOver = true;
  STATE.isBlocked = true;

  // Variáveis para calcular o time vencedor, o título principal da notificação e a legenda dos pontos
  let winTeam = -1, msg = '', detail = '';

  // Se alguém bateu (acabou as peças da mão)
  if (reason === 'win') {
    // Descobre o time: pares (0,2) são o Time 0. Ímpares (1,3) são o Time 1.
    winTeam = (winnerIdx % 2 === 0) ? 0 : 1;
    // Adiciona +1 ponto no placar geral do time vencedor
    STATE.scores[winTeam]++;
    // Registra quem foi o indivíduo que bateu pra ele poder começar o próximo round
    STATE.roundWinner = winnerIdx;
    
    // Calcula a mensagem pro usuário se a equipe dele ganhou ou perdeu
    msg = (myPlayerIdx % 2 === winnerIdx % 2) ? ' SUA DUPLA VENCEU!' : ' OPONENTES VENCERAM!';
    // Exibe o nome de quem bateu
    detail = `${NameManager.get(winnerIdx)} fechou a mao! +1 ponto`;
  
  // Se o jogo trancou porque os 4 passaram
  } else if (reason === 'block') {
    // Soma os pontos das peças restantes nas mãos do Time A (0 e 2)
    const sumA = STATE.hands[0].reduce((s, t) => s + t[0] + t[1], 0) + STATE.hands[2].reduce((s, t) => s + t[0] + t[1], 0);
    // Soma os pontos das peças restantes nas mãos do Time B (1 e 3)
    const sumB = STATE.hands[1].reduce((s, t) => s + t[0] + t[1], 0) + STATE.hands[3].reduce((s, t) => s + t[0] + t[1], 0);
    
    // A legenda mostra a pontagem
    detail = `Equipe A: ${sumA} pts  Equipe B: ${sumB} pts`;
    
    // O time com MENOS pontos ganha a rodada (regras clássicas do dominó)
    if (sumA < sumB) { winTeam = 0; STATE.scores[0]++; STATE.roundWinner = 0; }
    else if (sumB < sumA) { winTeam = 1; STATE.scores[1]++; STATE.roundWinner = 1; }
    // Se der empate nos pontos do trancamento, não ganha ninguém, e quem jogou a última peça começa
    else { winTeam = -1; STATE.roundWinner = STATE.lastPlayed ?? null; }
    
    // Titulo de jogo trancado com o resultado da soma
    msg = `JOGO trancado! (${sumA}x${sumB})`;
  }

  // Exibe o subtítulo descritivo no HTML
  const resDetail = document.getElementById('res-detail');
  if (resDetail) resDetail.textContent = detail;

  // Se for o Host, tem que mostrar o fim do jogo pros clientes
  if (netMode === 'host') {
    // Garante que o objeto das mãos expostas não contenha lixo
    const safeHands = STATE.hands.map(h => Array.isArray(h) ? h : []);
    // Transmite a vitória e as peças escondidas dos inimigos (pra todos verem quem tinha o quê)
    broadcastToClients({ type: 'end_round', winTeam, idx: winnerIdx, msg, hands: safeHands });
    broadcastState();
  }

  // Executa o visual do fim de round (painel de resultado, atualização de placar)
  executeEndRoundUI(winTeam, winnerIdx, msg);
}

// Função que efetiva uma jogada na mesa
function play(pIdx, tIdx, side) {
  // Ignora se o jogo estiver encerrado
  if (STATE.isOver) return;

  // Busca a mão do jogador atual
  const hand = STATE?.hands?.[pIdx];
  // Validação dura para evitar hacks ou bugs de rede (verifica se a peça existe)
  if (STATE.current !== pIdx || !Array.isArray(hand) || !hand[tIdx]) {
      console.warn("jogada invalida ignorada:", pIdx, tIdx);
      return;
  }

  // Lógica se quem estiver jogando for o Cliente conectando ao multiplayer
  if (netMode === 'client') {
    // Só deixa seguir se for ele e se a conexão estiver firme
    if (pIdx !== myPlayerIdx || !myConnToHost || !myConnToHost.open) return;
    // Oculta opções de escolha da tela
    const picker = document.getElementById('side-picker');
    if (picker) picker.style.display = 'none';
    
    STATE.isBlocked = true;
    client_predicted = true;
    
    // Retira a pedra da mão do cliente temporariamente pra parecer que jogou instantaneamente
    STATE.hands[pIdx].splice(tIdx, 1);
    STATE.handSize[pIdx]--;
    renderHands();
    
    // Manda o pedido de jogada pro Host validar lá e mandar de volta para todo mundo
    myConnToHost.send({ type: 'play_request', tIdx, side });
    return;
  }

  // Zera o contador de "passes consecutivos" porque alguém finalmente jogou uma peça
  STATE.playerPassed.fill(false); STATE.passCount = 0;
  // Grava quem foi essa última pessoa a jogar (útil pra critério de desempate)
  STATE.lastPlayed = pIdx;

  // Remove definitivamente a peça jogada da mão do jogador
  const tile = STATE.hands[pIdx].splice(tIdx, 1)[0];
  STATE.handSize[pIdx]--;
  renderHands();

  // Limpa o dado do lado em que a pedra vai (transforma "qualquer lado" no número 0)
  const normalizedSide = (side === 'any') ? 0 : side;
  
  // Chama a matemática pra calcular a posição X e Y que a peça deve ocupar na mesa visual
  const placement = calculateTilePlacement(tile, normalizedSide);

  // Se a mesa estiver vazia, define as pontas da mesa baseada nos valores da primeira pedra jogada
  if (!STATE.positions.length) STATE.extremes = (tile[0] === tile[1]) ? [tile[0], tile[0]] : [tile[0], tile[1]];
  // Se já tiver peças, atualiza o número da ponta da mesa que acabou de ser substituída
  else STATE.extremes[normalizedSide] = placement.vOther;

  // Salva essa posição nova na lista oficial da mesa
  STATE.positions.push(placement.nP);
  // Recalcula o zoom pra ver se essa peça nova não caiu fora da tela
  try { updateSnakeScale(); } catch (err) { console.error(err); }

  // Host sinaliza pro multiplayer tocar a animação da peça voando
  if (netMode === 'host') broadcastToClients({ type: 'animate_play', pIdx, nP: placement.nP, tIdx });

  // Toca a animação da peça saindo da mão do jogador
  animateTile(pIdx, placement.nP, () => {
    // Quando a animação acaba, desbloqueia o jogo
    STATE.isBlocked = false;
    // Desenha o tabuleiro em sua versão definitiva com a peça final
    renderBoardFromState();
    
    // Sincroniza a mesa com a rede
    if (typeof broadcastState === 'function') broadcastState();
    
    // Verifica se a mão do jogador zerou com essa peça
    if (STATE.hands[pIdx].length === 0) {
      STATE.roundWinner = pIdx;
      // Ganhou o round!
      endRound('win', pIdx);
    } else {
      // Passa pro próximo jogador da roda
      STATE.current = (STATE.current + 1) % 4;
      if (typeof broadcastState === 'function') broadcastState();
      // E reinicia o fluxo chamando o turno do próximo
      if (typeof processTurn === 'function') processTurn();
    }
  });
}
