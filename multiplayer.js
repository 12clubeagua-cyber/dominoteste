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
      console.log("Code displayed:", codeEl.innerText);
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
    conn.on('open', () => {
        // ... Lógica mantida
    });
    
    conn.on('data', (data) => {
      if (data.type === 'set_name') {
          NameManager.set(conn.assignedIdx, data.name);
          updateHostLobbyUI();
          broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
      }
      
      // ✅ NOVO: tratar reconexão
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
        // ... (lógica existente mantida)
    });
  });
}

// Handler de dados unificado
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
    }
    if (data.type === 'shuffle_start') runShuffleAnimation();
    
    if (data.type === 'sync_state') {
        // ... (lógica existente sync_state mantida)
        if (data.names) NameManager.updateAll(data.names);
        const hostState = data.state;
        STATE.hands = JSON.parse(JSON.stringify(hostState.hands));
        STATE.handSize = [...hostState.handSize];
        STATE.extremes = [...hostState.extremes];
        STATE.current = hostState.current;
        STATE.scores = [...hostState.scores];
        STATE.isOver = hostState.isOver;
        STATE.isBlocked = hostState.isBlocked;
        STATE.positions = JSON.parse(JSON.stringify(hostState.positions));
        STATE.playerPassed = [...hostState.playerPassed];
        STATE.passCount = hostState.passCount;
        STATE.ends = JSON.parse(JSON.stringify(hostState.ends));
        client_predicted = false;
        updateScoreDisplay();
        renderBoardFromState();
        renderHands(STATE.isOver);
        updateSnakeScale();
        if (!STATE.isOver && STATE.current === myPlayerIdx) {
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
        if (isReconnecting) {
            myConnToHost.send({ type: 'reconnect', name: NameManager.get(0), playerIdx: lastPlayerIdx });
        }
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

