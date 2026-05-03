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
    // Verifica se todas as conexões estão abertas
    const allReady = connectedClients.every(c => c && c.open);
    if (!allReady) {
      alert("Aguardando jogadores conectarem...");
      return;
    }

    const finalNames = NameManager.getAll();
    
    // Envia game_start para todos
    connectedClients.forEach((conn) => {
       if (conn.open) {
         conn.send({ type: 'game_start', yourIdx: conn.assignedIdx, names: finalNames });
       }
    });
    
    // Aguarda 500ms para garantir que clientes processaram o game_start
    setTimeout(() => {
      startRound();
    }, 500);
    
  } else if (netMode === 'offline') {
    startRound();
  }
}

function cancelHosting() {
    if (myPeer) {
        myPeer.destroy();
        myPeer = null;
    }
    connectedClients = [];
    netMode = 'offline';
    goToStep('step-mode');
}

