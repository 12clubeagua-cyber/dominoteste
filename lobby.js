/* 
   GERENCIAMENTO DE MENUS (lobby.js)
 */

// Função que limpa a tela, ocultando todas as etapas do menu inicial
function hideAllSteps() {
  // Busca todas as partes do menu e remove a classe que as torna visíveis na tela
  document.querySelectorAll('.start-step').forEach(el => el.classList.remove('active'));
}

// Função para avançar ou recuar para uma tela específica do menu
function goToStep(stepId) {
  // Primeiro esconde todas as telas para não ficar uma por cima da outra
  hideAllSteps();
  // Busca no HTML a tela exata que queremos mostrar agora
  const el = document.getElementById(stepId);
  // Se encontrar a tela, adiciona a classe para exibi-la
  if (el) el.classList.add('active');
}

// Função acionada quando o jogador escolhe o modo (Bots, Criar Sala ou Entrar na Sala)
function selectMode(mode) {
  // Lista de segurança com os modos permitidos pelo código
  const VALID_MODES = ['offline', 'host', 'client'];
  // Verifica se o modo recebido existe na lista acima
  if (!VALID_MODES.includes(mode)) {
    // Se vier um texto estranho, avisa o erro no painel do desenvolvedor
    console.warn('selectMode: mode invalido', mode);
    // E força o modo para o padrão local para o jogo não travar
    mode = 'offline';
  }
  // Salva o modo válido na variável global do jogo
  netMode = mode;
  
  // Se for jogar localmente ou criar uma sala multiplayer
  if (mode === 'offline' || mode === 'host') {
    // Manda o jogador para a tela de escolher a dificuldade dos bots
    goToStep('step-diff');
  // Se o jogador quiser apenas conectar em uma sala já criada
  } else if (mode === 'client') {
    // Pula direto para a tela de digitar o código de acesso
    goToStep('step-lobby-client');
  }
}

// Função acionada ao clicar em um nível de dificuldade
function selectDiff(diff) {
  // Salva a dificuldade escolhida no estado global do jogo
  STATE.difficulty = diff;
  // Lista com os identificadores dos botões na tela
  const ids = ['btn-easy', 'btn-normal', 'btn-hard'];
  // Percorre essa lista
  ids.forEach(id => {
      // Busca cada botão
      const el = document.getElementById(id);
      // Remove a aparência de "selecionado" de todos eles
      if (el) el.classList.remove('selected');
  });
  // Busca especificamente o botão que o usuário acabou de clicar
  const activeEl = document.getElementById(`btn-${diff}`);
  // Acende ele adicionando a aparência de "selecionado"
  if (activeEl) activeEl.classList.add('selected');
  // Avança para a próxima etapa: escolher a meta de vitórias
  goToStep('step-goal');
}

// Função acionada ao escolher qual será a pontuação final da partida
function selectGoal(limit) {
  // Proteção: verifica se o que chegou é um número e se não é um limite negativo ou zerado
  if (typeof limit !== 'number' || limit < 1) {
    // Avisa no console se algo veio quebrado
    console.warn('selectGoal: limit invalido', limit);
    // Assume um valor padrão de segurança para o jogo poder continuar
    limit = 3;  // Default
  }
  // Registra a meta de pontos no estado do jogo
  STATE.targetScore = limit;
  
  // Se for uma partida solitária contra bots
  if (netMode === 'offline') {
    // Inicia a partida imediatamente
    startMatch();
  // Se for o dono de uma sala online
  } else if (netMode === 'host') {
    // Abre a tela que mostra o código de convite para os amigos
    goToStep('step-lobby-host');
    // Liga a máquina do PeerJS para gerar o código e receber as conexões
    initializeHost();
  }
}

// Função que finaliza os menus e começa de fato a renderizar as peças
function startMatch() {
  // Libera o áudio do navegador (os navegadores exigem que um som só toque após um clique do usuário)
  if (typeof safeAudioInit === 'function') safeAudioInit();
  // Zera o placar das duas equipes
  STATE.scores = [0, 0];
  // Zera a memória de quem ganhou a última vez
  STATE.roundWinner = null;
  // Confirma que o jogo está rolando
  STATE.isOver = false;
  
  // Busca a tela principal de menus (que cobre a mesa verde)
  const startScreen = document.getElementById('start-screen');
  // Oculta ela, revelando o tabuleiro e os espaços vazios das mãos
  if (startScreen) startScreen.style.display = 'none';

  // Garante que os botões de cima/baixo não fiquem flutuando sozinhos na tela vazia
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  // Cria um atalho interno que verifica a segurança antes de chamar a função que distribui peças
  const doStartRound = () => {
      // Se a função principal existir no outro arquivo, chama ela
      if (typeof startRound === 'function') startRound();
      // Se sumiu, avisa do erro crítico
      else console.error('startRound nao esta definido');
  };

  // Se o jogo for controlado por um Host online
  if (netMode === 'host') {
    // Cancela tudo se a lista de clientes der erro no sistema
    if (!Array.isArray(connectedClients)) return;
    // Verifica se todos da lista estão com a conexão estável e abertos para receber dados
    const allReady = connectedClients.every(c => c && c.open);
    // Se alguém estiver engasgado na rede
    if (!allReady) {
      // Bloqueia o início e avisa na tela
      alert("Aguardando jogadores conectarem...");
      return;
    }

    // Pega os nomes de todos que sentaram nos lugares da mesa
    const finalNames = NameManager.getAll();
    // Passa por cada celular conectado na sala
    connectedClients.forEach((conn) => {
       // Se o celular do cliente estiver ouvindo
       if (conn && conn.open) {
         // Dispara o comando pra tela de menus deles sumir também, enviando de brinde a lista de nomes final
         try { conn.send({ type: 'game_start', yourIdx: conn.assignedIdx, names: finalNames }); } catch(e) {}
       }
    });
    // Aguarda um pequeno atraso para dar tempo do sinal chegar nos outros antes de embaralhar as peças
    setTimeout(doStartRound, 500);
    
  // Se for apenas o jogador local contra o computador
  } else if (netMode === 'offline') {
    // Vai direto para o embaralhamento e distribuição
    doStartRound();
  }
}

// Função ativada se o Host se arrepender e apertar para voltar na tela do código
function cancelHosting() {
    // Verifica se a conexão com os servidores do PeerJS está ativa
    if (myPeer) {
        // Encerra a conexão e libera o código da sala
        myPeer.destroy();
        // Zera a variável
        myPeer = null;
    }
    // Esvazia a lista de qualquer amigo que já tivesse entrado
    connectedClients = [];
    // Retorna o jogo para o modo solitário
    netMode = 'offline';
    // Volta o jogador para a tela raiz do menu inicial
    goToStep('step-mode');
}
