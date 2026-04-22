/* ═══════════════════════════════════════════════════════
   LÓGICA PEERJS (multiplayer.js)
═══════════════════════════════════════════════════════ */

function generateShortID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'DOMINO-' + result;
}

function initializeHost() {
  if (myPeer) myPeer.destroy();
  const roomCode = generateShortID();
  const codeEl = document.getElementById('host-code-display');
  if (codeEl) codeEl.innerText = roomCode.split('-')[1];
  
  myPeer = new Peer(roomCode);
  
  myPeer.on('open', () => {
      const btn = document.getElementById('btn-start-multi');
      if (btn) btn.style.display = 'flex';
  });

  myPeer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
        alert("Código de sala já em uso. Tente novamente.");
        window.location.reload();
    }
  });

  myPeer.on('connection', (conn) => {
    if (connectedClients.length >= 3) {
      conn.send({ type: 'error', msg: 'Sala cheia!' });
      setTimeout(() => conn.close(), 500);
      return;
    }
    conn.on('open', () => {
      connectedClients.push(conn);
      updateHostLobbyUI();
      conn.send({ type: 'welcome', msg: 'Conectado! Aguarde o host.' });
    });
    conn.on('data', (data) => {
      if (data.type === 'play_request' && !STATE.isBlocked && STATE.current === conn.assignedIdx) {
          play(conn.assignedIdx, data.tIdx, data.side);
      }
      if (data.type === 'next_round_request' && STATE.isOver) startRound();
    });
    conn.on('close', () => {
      connectedClients = connectedClients.filter(c => c.peer !== conn.peer);
      updateHostLobbyUI();
    });
  });
}

function updateHostLobbyUI() {
  const countEl = document.getElementById('host-status');
  if (countEl) countEl.innerText = `Jogadores: ${connectedClients.length}/3`;
  const list = document.getElementById('host-player-list');
  if (!list) return;
  list.innerHTML = '<div class="player-item">Você (Host)</div>';
  connectedClients.forEach(() => {
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerText = `Jogador conectado`;
    list.appendChild(el);
  });
}

function cancelHosting() {
  connectedClients.forEach(conn => {
    conn.send({ type: 'status', text: 'O Host encerrou a sala.', cls: 'pass' });
    conn.close();
  });
  if (myPeer) { myPeer.destroy(); myPeer = null; }
  connectedClients = [];
  goToStep('step-mode');
}

function broadcastToClients(payload) {
  connectedClients.forEach(c => c.send(payload));
}

function broadcastState() {
  if (netMode === 'host') broadcastToClients({ type: 'sync_state', state: STATE });
}

function connectToHost() {
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  if (input.length < 5) return;

  const statusEl = document.getElementById('client-status');
  if (statusEl) statusEl.innerText = "Conectando...";
  
  if (myPeer) myPeer.destroy();
  myPeer = new Peer(); 
  
  myPeer.on('open', () => {
    myConnToHost = myPeer.connect('DOMINO-' + input);
    myConnToHost.on('open', () => {
        if (statusEl) statusEl.innerText = "Aguardando início...";
    });
    
    myConnToHost.on('data', (data) => {
      if (data.type === 'game_start') {
        myPlayerIdx = data.yourIdx;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        updateScoreDisplay(); 
      }
      if (data.type === 'shuffle_start') runShuffleAnimation();
      
      if (data.type === 'sync_state') {
        // CORREÇÃO: Injeta os dados no objeto existente para manter a referência
        Object.assign(STATE, data.state);
        updateScoreDisplay();
        renderBoardFromState(); 
        renderHands(STATE.isOver); 
        updateSnakeScale();
      }
      
      if (data.type === 'animate_play') {
         if (data.pIdx === myPlayerIdx && !client_predicted) {
            STATE.hands[data.pIdx].splice(data.tIdx, 1);
            STATE.handSize[data.pIdx]--;
            renderHands();
         } else if (data.pIdx !== myPlayerIdx) {
            STATE.hands[data.pIdx].pop(); 
            STATE.handSize[data.pIdx]--;
            renderHands();
         }
         client_predicted = false;
         animateTile(data.pIdx, data.nP, () => {});
      }
      
      if (data.type === 'status') updateStatusLocal(data.text, data.cls);
      
      if (data.type === 'animate_pass') {
          playPass(); // Som remoto
          triggerPassVisual(data.pIdx);
      }
      
      if (data.type === 'end_round') executeEndRoundUI(data.winTeam, data.idx, data.msg);
    });
    
    myConnToHost.on('close', () => window.location.reload());
  });
}
