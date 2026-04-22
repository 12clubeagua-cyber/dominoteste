/* ═══════════════════════════════════════════════════════
   LÓGICA PEERJS: HOST E CLIENT (multiplayer.js)
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
  document.getElementById('host-code-display').innerText = roomCode.split('-')[1];
  
  myPeer = new Peer(roomCode);
  
  myPeer.on('open', (id) => {
    document.getElementById('btn-start-multi').style.display = 'flex';
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
      conn.send({ type: 'welcome', msg: 'Conectado! Aguarde o host iniciar.' });
    });

    conn.on('data', (data) => {
      if (data.type === 'play_request' && !STATE.isBlocked) {
        if (STATE.current === conn.assignedIdx) {
          play(conn.assignedIdx, data.tIdx, data.side);
        }
      }
      if (data.type === 'next_round_request') {
         if (STATE.isOver) startRound();
      }
    });

    conn.on('close', () => {
      connectedClients = connectedClients.filter(c => c.peer !== conn.peer);
      updateHostLobbyUI();
    });
  });
}

function updateHostLobbyUI() {
  const count = connectedClients.length;
  document.getElementById('host-status').innerText = `Jogadores conectados: ${count}/3`;
  const list = document.getElementById('host-player-list');
  list.innerHTML = '<div class="player-item">Você (Host)</div>';
  connectedClients.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerText = `Jogador conectado`;
    list.appendChild(el);
  });
}

function cancelHosting() {
  if (myPeer) { myPeer.destroy(); myPeer = null; }
  connectedClients = [];
  goToStep('step-mode');
}

function broadcastToClients(payload) {
  connectedClients.forEach(c => c.send(payload));
}

function broadcastState() {
  if (netMode !== 'host') return;
  broadcastToClients({ type: 'sync_state', state: STATE });
}

function connectToHost() {
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  if (input.length < 5) {
    document.getElementById('client-status').innerText = "Código inválido!";
    return;
  }

  document.getElementById('client-status').innerText = "Conectando...";
  document.getElementById('btn-connect').disabled = true;

  if (myPeer) myPeer.destroy();
  myPeer = new Peer(); 
  
  myPeer.on('open', (id) => {
    const targetRoom = 'DOMINO-' + input;
    myConnToHost = myPeer.connect(targetRoom);

    myConnToHost.on('open', () => {
      document.getElementById('client-status').innerText = "Conectado! Aguardando Host iniciar...";
    });

    myConnToHost.on('data', (data) => {
      if (data.type === 'game_start') {
        myPlayerIdx = data.yourIdx;
        document.getElementById('start-screen').style.display = 'none';
        updateScoreDisplay(); 
      }
      
      if (data.type === 'shuffle_start') {
          runShuffleAnimation();
      }

      if (data.type === 'sync_state') {
        STATE = data.state;
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

      if (data.type === 'status') {
         updateStatusLocal(data.text, data.cls);
      }

      if (data.type === 'animate_pass') {
         triggerPassVisual(data.pIdx);
      }

      if (data.type === 'end_round') {
         executeEndRoundUI(data.winTeam, data.idx, data.msg);
      }
    });

    myConnToHost.on('close', () => {
      alert("O Host encerrou a sala.");
      window.location.reload();
    });
  });

  myPeer.on('error', (err) => {
    document.getElementById('client-status').innerText = "Erro: Não encontrou a sala.";
    document.getElementById('btn-connect').disabled = false;
  });
}