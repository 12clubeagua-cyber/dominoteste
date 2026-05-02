/* ═══════════════════════════════════════════════════════
   GERENCIAMENTO DE MENUS (lobby.js)
═══════════════════════════════════════════════════════ */
function hideAllSteps() {
  document.querySelectorAll('.start-step').forEach(el => el.classList.remove('active'));
}

function goToStep(stepId) {
  hideAllSteps();
  document.getElementById(stepId).classList.add('active');
}

function selectMode(mode) {
  netMode = mode;
  if (mode === 'offline' || mode === 'host') {
    goToStep('step-diff');
  } else if (mode === 'client') {
    goToStep('step-lobby-client');
  }
}

function selectDiff(diff) {
  STATE.difficulty = diff;
  document.getElementById('btn-easy').classList.remove('selected');
  document.getElementById('btn-normal').classList.remove('selected');
  document.getElementById('btn-hard').classList.remove('selected');
  document.getElementById(`btn-${diff}`).classList.add('selected');
  goToStep('step-goal');
}

function selectGoal(limit) {
  STATE.targetScore = limit;
  if (netMode === 'offline') {
    startMatch();
  } else if (netMode === 'host') {
    goToStep('step-lobby-host');
    initializeHost();
  }
}

function startMatch() {
  safeAudioInit();
  STATE.scores = [0, 0];
  STATE.roundWinner = null;
  STATE.isOver = false;
  document.getElementById('start-screen').style.display = 'none';

  if (netMode === 'host') {
    // Assentos já foram atribuídos na conexão (initializeHost):
    // 1º cliente = assento 2 (parceiro do host), 2º = assento 1, 3º = assento 3

    // 2. Constrói o mapa final de nomes
    // Já temos o nome do Host no NameManager (index 0)
    // Agora pegamos o nome de cada cliente conectado
    connectedClients.forEach(conn => {
        // Nome já foi setado via 'set_name' anteriormente pelo cliente
    });

    // 3. Broadcast final do mapa de nomes para todos
    const finalNames = NameManager.getAll();
    connectedClients.forEach((conn) => {
       conn.send({ type: 'game_start', yourIdx: conn.assignedIdx, names: finalNames });
    });
    
    // O Host também precisa chamar startRound()
    startRound();
  } else if (netMode === 'offline') {
    startRound();
  }
}

