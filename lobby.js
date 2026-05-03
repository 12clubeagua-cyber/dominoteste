/* 
   GERENCIAMENTO DE MENUS (lobby.js)
 */
function hideAllSteps() {
  document.querySelectorAll('.start-step').forEach(el => el.classList.remove('active'));
}

function goToStep(stepId) {
  hideAllSteps();
  const el = document.getElementById(stepId);
  if (el) el.classList.add('active');
}

function selectMode(mode) {
  const VALID_MODES = ['offline', 'host', 'client'];
  if (!VALID_MODES.includes(mode)) {
    console.warn('selectMode: mode invalido', mode);
    mode = 'offline';
  }
  netMode = mode;
  if (mode === 'offline' || mode === 'host') {
    goToStep('step-diff');
  } else if (mode === 'client') {
    goToStep('step-lobby-client');
  }
}

function selectDiff(diff) {
  STATE.difficulty = diff;
  const ids = ['btn-easy', 'btn-normal', 'btn-hard'];
  ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('selected');
  });
  const activeEl = document.getElementById(`btn-${diff}`);
  if (activeEl) activeEl.classList.add('selected');
  goToStep('step-goal');
}

function selectGoal(limit) {
  if (typeof limit !== 'number' || limit < 1) {
    console.warn('selectGoal: limit invalido', limit);
    limit = 3;  // Default
  }
  STATE.targetScore = limit;
  if (netMode === 'offline') {
    startMatch();
  } else if (netMode === 'host') {
    goToStep('step-lobby-host');
    initializeHost();
  }
}

function startMatch() {
  if (typeof safeAudioInit === 'function') safeAudioInit();
  STATE.scores = [0, 0];
  STATE.roundWinner = null;
  STATE.isOver = false;
  
  const startScreen = document.getElementById('start-screen');
  if (startScreen) startScreen.style.display = 'none';

  const doStartRound = () => {
      if (typeof startRound === 'function') startRound();
      else console.error('startRound nao esta definido');
  };

  if (netMode === 'host') {
    if (!Array.isArray(connectedClients)) return;
    const allReady = connectedClients.every(c => c && c.open);
    if (!allReady) {
      alert("Aguardando jogadores conectarem...");
      return;
    }

    const finalNames = NameManager.getAll();
    connectedClients.forEach((conn) => {
       if (conn && conn.open) {
         try { conn.send({ type: 'game_start', yourIdx: conn.assignedIdx, names: finalNames }); } catch(e) {}
       }
    });
    setTimeout(doStartRound, 500);
    
  } else if (netMode === 'offline') {
    doStartRound();
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



