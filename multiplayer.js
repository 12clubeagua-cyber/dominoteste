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
  console.log("initializeHost called");
  if (myPeer) myPeer.destroy();
  const roomCode = generateShortID();
  
  const codeEl = document.getElementById('host-code-display');
  if (codeEl) {
      codeEl.innerText = roomCode.split('-')[1];
  }
  
  myPeer = new Peer(roomCode);
  
  myPeer.on('open', (id) => {
      console.log("Host Peer initialized with ID:", id);
      const btn = document.getElementById('btn-start-multi');
      if (btn) btn.style.display = 'flex';
  });

  myPeer.on('error', (err) => {
    console.error("Peer error:", err);
    if (err.type === 'unavailable-id') {
        alert("Código de sala já em uso. Tente novamente.");
        window.location.reload();
    }
  });

  myPeer.on('connection', (conn) => {
    const takenIdx = connectedClients.map(c => c.assignedIdx);
    let freeIdx = -1;
    for(let i=1; i<=3; i++) {
        if (!takenIdx.includes(i)) {
            freeIdx = i;
            break;
        }
    }

    if (freeIdx === -1) {
        conn.on('open', () => {
            conn.send({ type: 'error', msg: 'Sala cheia!' });
            setTimeout(() => conn.close(), 100);
        });
        return;
    }

    conn.assignedIdx = freeIdx;
    connectedClients.push(conn);
    console.log(`[HOST] Jogador conectado no assento ${freeIdx}`);

    conn.on('open', () => {
        conn.send({ 
            type: 'welcome', 
            yourIdx: freeIdx, 
            names: NameManager.getAll() 
        });
        NameManager.set(freeIdx, `Jogador ${freeIdx}`);
        updateHostLobbyUI();
        broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
    });
    
    conn.on('data', (data) => {
      if (data.type === 'set_name') {
          NameManager.set(conn.assignedIdx, data.name);
          updateHostLobbyUI();
          broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
      }
      
      if (data.type === 'reconnect') {
          const requestedIdx = data.playerIdx;
          const seatValid = [1, 2, 3].includes(requestedIdx);
          const seatFree  = !connectedClients.some(c => c.assignedIdx === requestedIdx);
          
          if (seatValid && seatFree) {
              conn.assignedIdx = requestedIdx;
              NameManager.set(requestedIdx, data.name);
              console.log(`[HOST] Jogador ${requestedIdx} (${data.name}) reconectado!`);
              broadcastState();
              broadcastToClients({ type: 'status', text: `${data.name} voltou!`, cls: 'active' });
              updateStatus(`${data.name} reconectado!`, 'active');
          } else {
              conn.send({ type: 'error', msg: seatFree ? 'Assento inválido.' : 'Assento já ocupado.' });
          }
      }
      
      if (data.type === 'play_request' && STATE.current === conn.assignedIdx) {
          play(conn.assignedIdx, data.tIdx, data.side);
      }
      if (data.type === 'next_round_request' && STATE.isOver) startRound();
    });

    conn.on('close', () => {
        console.log(`[HOST] Jogador ${conn.assignedIdx} desconectou.`);
        connectedClients = connectedClients.filter(c => c !== conn);
        NameManager.set(conn.assignedIdx, 'Aguardando...');
        updateHostLobbyUI();
        if (!STATE.isOver) {
             STATE.isBlocked = true;
             updateStatus(`Jogador ${conn.assignedIdx} desconectou. Jogo pausado.`, 'pass');
             broadcastToClients({ type: 'status', text: 'Jogador desconectou. Aguardando...', cls: 'pass' });
        }
    });
  });
}

function broadcastState() {
  if (netMode === 'host') {
    const anonymizedState = JSON.parse(JSON.stringify(STATE));
    
    connectedClients.forEach(conn => {
      if (!conn || !conn.open || conn.assignedIdx === undefined) return;
      
      const clientIdx = conn.assignedIdx;
      const filteredHands = anonymizedState.hands.map((hand, idx) => 
        (idx === clientIdx ? hand : [])
      );
      
      try {
        conn.send({ 
          type: 'sync_state', 
          state: { ...anonymizedState, hands: filteredHands }, 
          names: NameManager.getAll() 
        });
      } catch(e) {
        console.error("Erro ao enviar estado:", e);
      }
    });
  }
}

function updateHostLobbyUI() {
  const listEl = document.getElementById('host-player-list');
  const statusEl = document.getElementById('host-status');
  if (!listEl) return;

  listEl.innerHTML = `<div class="player-item">Você (Host) - ${NameManager.get(0)}</div>`;
  let count = 1;
  connectedClients.forEach(conn => {
    if (conn.assignedIdx) {
      count++;
      listEl.innerHTML += `<div class="player-item">Jogador ${conn.assignedIdx} - ${NameManager.get(conn.assignedIdx)}</div>`;
    }
  });

  if (statusEl) statusEl.innerText = `Aguardando conexões... (${count}/4)`;
  const btnStart = document.getElementById('btn-start-multi');
  if (btnStart) btnStart.style.display = (count >= 2) ? 'flex' : 'none'; 
}

function handleClientData(data) {
  if (data.type === 'sync_names') { 
    NameManager.updateAll(data.names); 
    renderHands(STATE.isOver); 
  }
  
  if (data.type === 'welcome') { 
    myPlayerIdx = data.yourIdx; 
    if (data.names) NameManager.updateAll(data.names); 
  }
  
  if (data.type === 'game_start') { 
    myPlayerIdx = data.yourIdx; 
    if (data.names) NameManager.updateAll(data.names); 
    const startScreen = document.getElementById('start-screen'); 
    if (startScreen) startScreen.style.display = 'none'; 
    updateScoreDisplay();
    // Limpa estado anterior para evitar conflitos
    STATE.positions = [];
    STATE.hands = [];
  }
  
  if (data.type === 'shuffle_start') {
    runShuffleAnimation();
  }
  
  if (data.type === 'sync_state') {
    if (data.names) NameManager.updateAll(data.names);
    
    // Só processa se já souber quem sou
    if (myPlayerIdx === undefined || myPlayerIdx === null) {
      console.warn("Recebi sync_state mas não sei meu índice ainda");
      return;
    }
    
    const hostState = data.state;
    
    // Atualiza estado preservando referências se necessário
    STATE.hands = JSON.parse(JSON.stringify(hostState.hands));
    STATE.handSize = [...hostState.handSize];
    STATE.extremes = [...hostState.extremes];
    STATE.current = hostState.current;
    STATE.scores = [...hostState.scores];
    STATE.isOver = hostState.isOver;
    STATE.isBlocked = hostState.isBlocked;
    STATE.positions = JSON.parse(JSON.stringify(hostState.positions || []));
    STATE.playerPassed = [...(hostState.playerPassed || [false,false,false,false])];
    STATE.passCount = hostState.passCount || 0;
    STATE.ends = JSON.parse(JSON.stringify(hostState.ends || []));
    
    client_predicted = false;
    updateScoreDisplay();
    renderBoardFromState();
    renderHands(STATE.isOver);
    updateSnakeScale();
    
    if (!STATE.isOver && STATE.current === myPlayerIdx) {
      // Remove bloqueio se for nossa vez
      STATE.isBlocked = false;
      setTimeout(processTurn, 100);
    } else if (!STATE.isOver) {
      STATE.isBlocked = true;
      updateStatusLocal(`${NameManager.get(STATE.current)} JOGANDO...`);
    }
  }
  
  if (data.type === 'animate_play') {
       client_predicted = false;
       const alreadyExists = STATE.positions.some(p => p.x === data.nP.x && p.y === data.nP.y);
       if (!alreadyExists) STATE.positions.push(data.nP);
       animateTile(data.pIdx, data.nP, () => { renderBoardFromState(); });
  }
  if (data.type === 'status') updateStatusLocal(data.text, data.cls);
  if (data.type === 'animate_pass') { triggerPassVisual(data.pIdx); playPass(); }
  if (data.type === 'end_round') {
      if (data.hands) STATE.hands = data.hands;
      executeEndRoundUI(data.winTeam, data.idx, data.msg);
  }
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
        lastRoomCode = input;
        sessionStorage.setItem('reconnect_room', input);
        sessionStorage.setItem('reconnect_name', NameManager.get(0));
        reconnectAttempts = 0;
        isReconnecting = false;
        myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
    });
    myConnToHost.on('data', handleClientData);
    myConnToHost.on('close', () => {
        if (STATE.isOver && STATE.scores[0] >= STATE.targetScore || STATE.scores[1] >= STATE.targetScore) return;
        tentarReconectar();
    });
    myPeer.on('error', (err) => { console.error("PeerJS Error:", err); });
  });
}

function tentarReconectar() {
    if (isReconnecting) return;
    isReconnecting = true;
    const savedRoom = lastRoomCode || sessionStorage.getItem('reconnect_room');
    if (!savedRoom) { alert("Conexão perdida e sem dados para reconectar."); window.location.reload(); return; }
    showReconnectOverlay(reconnectAttempts + 1, MAX_RECONNECT_ATTEMPTS);
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) { hideReconnectOverlay(); showReconnectFailed(); return; }
    reconnectAttempts++;
    if (myPeer && !myPeer.destroyed) try { myPeer.destroy(); } catch(e) {}
    reconnectTimer = setTimeout(() => {
        myPeer = new Peer();
        myPeer.on('open', () => {
            myConnToHost = myPeer.connect('DOMINO-' + savedRoom);
            myConnToHost.on('open', () => {
                reconnectAttempts = 0; isReconnecting = false; hideReconnectOverlay();
                const savedName = NameManager.get(0) || sessionStorage.getItem('reconnect_name');
                myConnToHost.send({ type: 'set_name', name: savedName });
                myConnToHost.send({ type: 'reconnect', name: savedName, playerIdx: myPlayerIdx });
            });
            myConnToHost.on('data', handleClientData);
            myConnToHost.on('close', () => { if (!isReconnecting) tentarReconectar(); });
            myConnToHost.on('error', () => { tentarReconectar(); });
        });
        myPeer.on('error', () => { isReconnecting = false; tentarReconectar(); });
    }, RECONNECT_DELAY_MS);
}

function showReconnectOverlay(attempt, max) {
    const el = document.getElementById('reconnect-overlay');
    const msg = document.getElementById('reconnect-msg');
    if (el) el.style.display = 'flex';
    if (msg) msg.innerText = `Tentando reconectar... (${attempt}/${max})`;
}
function hideReconnectOverlay() { const el = document.getElementById('reconnect-overlay'); if (el) el.style.display = 'none'; }
function showReconnectFailed() { hideReconnectOverlay(); const el = document.getElementById('reconnect-failed'); if (el) el.style.display = 'flex'; }
function cancelReconnect() { clearTimeout(reconnectTimer); isReconnecting = false; hideReconnectOverlay(); window.location.reload(); }
function tentarReconectarManual() { const el = document.getElementById('reconnect-failed'); if (el) el.style.display = 'none'; reconnectAttempts = 0; isReconnecting = false; tentarReconectar(); }

