/* 
   LOGICA PEERJS (multiplayer.js)
 */

function generateShortID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'domino-' + result;
}

function initializeHost() {
  if (typeof Peer === 'undefined') return;
  if (myPeer) myPeer.destroy();
  const roomCode = generateShortID();
  
  const codeEl = document.getElementById('host-code-display');
  if (codeEl) codeEl.innerText = roomCode.split('-')[1];
  
  myPeer = new Peer(roomCode);
  
  myPeer.on('open', (id) => {
      const btn = document.getElementById('btn-start-multi');
      if (btn) btn.style.display = 'flex';
  });

  myPeer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
        alert("Codigo de sala ja em uso.");
        window.location.reload();
    }
  });

  myPeer.on('connection', (conn) => {
    const takenIdx = connectedClients.map(c => c.assignedIdx);
    let freeIdx = -1;
    for(let i=1; i<=3; i++) {
        if (!takenIdx.includes(i)) { freeIdx = i; break; }
    }

    if (freeIdx === -1) {
        conn.on('open', () => { conn.send({ type: 'error', msg: 'Sala cheia!' }); setTimeout(() => conn.close(), 100); });
        return;
    }

    conn.assignedIdx = freeIdx;
    connectedClients.push(conn);

    conn.on('open', () => {
        conn.send({ type: 'welcome', yourIdx: freeIdx, names: NameManager.getAll() });
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
              broadcastState();
              updateStatus(`${data.name} reconectado!`, 'active');
          } else {
              conn.send({ type: 'error', msg: seatFree ? 'Assento invalido.' : 'Assento ja ocupado.' });
          }
      }
      
      if (data.type === 'play_request' && STATE.current === conn.assignedIdx) play(conn.assignedIdx, data.tIdx, data.side);
      if (data.type === 'next_round_request' && STATE.isOver) startRound();
    });

    conn.on('close', () => {
        connectedClients = connectedClients.filter(c => c !== conn);
        NameManager.set(conn.assignedIdx, 'Aguardando...');
        updateHostLobbyUI();
        if (!STATE.isOver) {
             STATE.isBlocked = true;
             updateStatus(`Jogador ${conn.assignedIdx} desconectou. Jogo pausado.`, 'pass');
        }
    });
  });
}

function broadcastState() {
  if (netMode !== 'host') return;
  
  let anonymizedState;
  try {
      anonymizedState = JSON.parse(JSON.stringify(STATE));
  } catch (e) { return; }

  connectedClients.forEach(conn => {
    if (!conn || !conn.open || conn.assignedIdx === undefined) return;
    const clientIdx = conn.assignedIdx;
    const filteredHands = anonymizedState.hands.map((hand, idx) => (idx === clientIdx ? hand : []));
    conn.send({ type: 'sync_state', state: { ...anonymizedState, hands: filteredHands }, names: NameManager.getAll() });
  });
}

function updateHostLobbyUI() {
  const listEl = document.getElementById('host-player-list');
  const statusEl = document.getElementById('host-status');
  if (!listEl) return;

  let html = `<div class="player-item">Voce (Host) - ${NameManager.get(0)}</div>`;
  connectedClients.forEach(conn => {
    if (conn.assignedIdx) html += `<div class="player-item">Jogador ${conn.assignedIdx} - ${NameManager.get(conn.assignedIdx)}</div>`;
  });

  listEl.innerHTML = html;
  if (statusEl) statusEl.innerText = `Aguardando conexoes... (${connectedClients.length + 1}/4)`;
  const btnStart = document.getElementById('btn-start-multi');
  if (btnStart) btnStart.style.display = (connectedClients.length >= 1) ? 'flex' : 'none'; 
}

function handleClientData(data) {
  if (data.type === 'sync_names') { NameManager.updateAll(data.names); renderHands(STATE.isOver); }
  if (data.type === 'welcome') { myPlayerIdx = data.yourIdx; if (data.names) NameManager.updateAll(data.names); }
  
  if (data.type === 'game_start') { 
    myPlayerIdx = data.yourIdx; 
    if (data.names) NameManager.updateAll(data.names); 
    const startScreen = document.getElementById('start-screen'); 
    if (startScreen) startScreen.style.display = 'none'; 
    updateScoreDisplay();

    // Garante que o seletor de lado esteja escondido
    const picker = document.getElementById('side-picker');
    if (picker) picker.style.display = 'none';
    
    // Reset completo
    STATE = {
        ...STATE,
        hands: [[],[],[],[]],
        handSize: [7,7,7,7],
        extremes: [null, null],
        ends: [
          { hscX: 0, hscY: 0, dir: 270, lineCount: 1, lastVDir: 270, wasDouble: false },
          { hscX: 0, hscY: 0, dir: 90,  lineCount: 1, lastVDir: 90,  wasDouble: false }
        ],
        positions: [],
        scores: [0,0],
        current: 0,
        passCount: 0,
        playerPassed: [false,false,false,false],
        playerMemory: [[],[],[],[]],
        isOver: false,
        isBlocked: false,
        isShuffling: false,
        matchOver: false
    };
  }
  
  if (data.type === 'shuffle_start') runShuffleAnimation();
  
  if (data.type === 'sync_state') {
    if (data.names) NameManager.updateAll(data.names);
    if (STATE.turnTimer) clearTimeout(STATE.turnTimer);
    if (myPlayerIdx === undefined || myPlayerIdx === null) return;
    
    const hostState = data.state;
    if (!hostState) return;
    
    STATE.hands = hostState.hands || [[],[],[],[]];
    STATE.handSize = hostState.handSize || [7,7,7,7];
    STATE.extremes = hostState.extremes || [null, null];
    STATE.current = hostState.current ?? 0;
    STATE.scores = hostState.scores || [0, 0];
    STATE.isOver = hostState.isOver ?? false;
    
    updateScoreDisplay();
    renderBoardFromState();
    renderHands(STATE.isOver);
    updateSnakeScale();
    
    if (!STATE.isOver && STATE.current === myPlayerIdx) {
      STATE.isBlocked = false;
      setTimeout(processTurn, 100);
    } else if (!STATE.isOver) {
      STATE.isBlocked = true;
      updateStatusLocal(`${NameManager.get(STATE.current)} JOGANDO...`);
    }
  }
  
  if (data.type === 'animate_play') {
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
  if (typeof Peer === 'undefined') return;
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  if (input.length < 5) return;
  
  const statusEl = document.getElementById('client-status');
  if (statusEl) statusEl.innerText = "Conectando...";

  if (myPeer) myPeer.destroy();
  myPeer = new Peer(); 
  
  myPeer.on('error', (err) => {
    console.error("Peer error:", err);
    if (statusEl) statusEl.innerText = "Erro: " + (err.type === 'peer-unavailable' ? "Sala nao encontrada" : err.type);
  });

  myPeer.on('open', () => {
    myConnToHost = myPeer.connect('domino-' + input);
    
    myConnToHost.on('data', handleClientData);
    myConnToHost.on('close', () => { 
        if (statusEl) statusEl.innerText = "Conexao fechada.";
        setTimeout(() => window.location.reload(), 2000);
    });
    myConnToHost.on('error', (err) => { 
        if (statusEl) statusEl.innerText = "Erro na conexao.";
    });
    
    myConnToHost.on('open', () => {
        if (statusEl) statusEl.innerText = "Conectado! Aguardando host...";
        myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
    });
  });
}

function tentarReconectar() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts = 0;
        return;
    }
    
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (typeof Peer === 'undefined') return;
        myPeer = new Peer();
        myPeer.on('open', () => {
            myConnToHost = myPeer.connect('domino-' + lastRoomCode);
            myConnToHost.on('data', handleClientData);
            myConnToHost.on('open', () => {
                reconnectAttempts = 0;
                myConnToHost.send({ type: 'reconnect', name: NameManager.get(0), playerIdx: myPlayerIdx });
            });
        });
    }, RECONNECT_DELAY_MS);
}

function broadcastToClients(data) {
    connectedClients.forEach(client => {
        if (!client || !client.open) return;
        try {
            client.send(data);
        } catch(e) {
            console.error('Erro ao enviar:', e);
        }
    });
}



