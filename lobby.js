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
  document.getElementById('start-screen').style.display = 'none';
  
  if (netMode === 'host') {
    const seatOrder = [2, 1, 3];
    connectedClients.forEach((conn, index) => {
       conn.assignedIdx = seatOrder[index];
       conn.send({ type: 'game_start', yourIdx: conn.assignedIdx });
    });
  }
  
  updateScoreDisplay();
  if (netMode !== 'client') startRound();
}
