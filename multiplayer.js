/* 
   LOGICA PEERJS (multiplayer.js) - Versão Robusta Reestruturada
 */

const MAX_PLAYERS = 4;
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

let seatLock = false;

/* ===================== ID ===================== */

function generateShortID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'domino-' + result;
}

/* ===================== HOST ===================== */

function initializeHost() {
  if (typeof Peer === 'undefined') return;

  if (myPeer) myPeer.destroy();

  const roomCode = generateShortID();
  lastRoomCode = roomCode;

  const codeEl = document.getElementById('host-code-display');
  if (codeEl) codeEl.innerText = roomCode.split('-')[1];

  myPeer = new Peer(roomCode);

  myPeer.on('open', () => {
    const btn = document.getElementById('btn-start-multi');
    if (btn) btn.style.display = 'flex';
  });

  myPeer.on('connection', (conn) => {
    attachConnectionHandlers(conn);
  });

  myPeer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      console.warn("ID indisponivel, tentando novamente...");
      setTimeout(initializeHost, 500);
    }
  });
}

function attachConnectionHandlers(conn) {
  conn.on('open', () => {
    const idx = getFreeSeat();
    if (idx === -1) {
      conn.send({ type: 'error', msg: 'Sala cheia' });
      setTimeout(() => conn.close(), 100);
      return;
    }

    conn.assignedIdx = idx;
    connectedClients.push(conn);

    NameManager.set(idx, `Jogador ${idx}`);

    conn.send({
      type: 'welcome',
      yourIdx: idx,
      names: NameManager.getAll()
    });

    updateHostLobbyUI();
    broadcastNames();
  });

  conn.on('data', (data) => handleHostMessage(conn, data));
  conn.on('close', () => cleanupConnection(conn));
  conn.on('error', () => cleanupConnection(conn));
}

function cleanupConnection(conn) {
  connectedClients = connectedClients.filter(c => c !== conn);

  if (conn.assignedIdx !== undefined) {
    // Só reseta o nome se não houver outra conexão ocupando o mesmo índice (evita bugs de reconexão)
    if (!connectedClients.some(c => c.assignedIdx === conn.assignedIdx)) {
      NameManager.set(conn.assignedIdx, 'Aguardando...');
    }
  }

  updateHostLobbyUI();

  if (!STATE.isOver) {
    STATE.isBlocked = true;
    updateStatus(`Jogador ${conn.assignedIdx} desconectou. Jogo pausado.`, 'pass');
  }
}

function getFreeSeat() {
  for (let i = 1; i < MAX_PLAYERS; i++) {
    if (!connectedClients.some(c => c.assignedIdx === i)) return i;
  }
  return -1;
}

/* ===================== HOST MESSAGES ===================== */

function handleHostMessage(conn, data) {
  if (!data || !data.type) return;

  switch (data.type) {
    case 'set_name':
      if (typeof data.name === 'string') {
        NameManager.set(conn.assignedIdx, data.name.slice(0, 15));
        updateHostLobbyUI();
        broadcastNames();
      }
      break;

    case 'request_seat':
      handleSeatRequest(conn, data.seatIdx);
      break;

    case 'reconnect':
      handleReconnect(conn, data);
      break;

    case 'play_request':
      if (STATE.current === conn.assignedIdx && !STATE.isBlocked) {
        play(conn.assignedIdx, data.tIdx, data.side);
      }
      break;

    case 'next_round_request':
      if (STATE.isOver) startRound();
      break;
  }
}

/* ===================== SEATS ===================== */

function handleSeatRequest(conn, requestedIdx) {
  if (seatLock) return;
  seatLock = true;

  const valid = requestedIdx > 0 && requestedIdx < MAX_PLAYERS;
  const free = !connectedClients.some(c => c.assignedIdx === requestedIdx);

  if (valid && free) {
    const oldIdx = conn.assignedIdx;
    conn.assignedIdx = requestedIdx;

    // Se o nome era o padrão, atualiza para o novo índice
    if (NameManager.get(oldIdx) === `Jogador ${oldIdx}`) {
        NameManager.set(requestedIdx, `Jogador ${requestedIdx}`);
    } else {
        NameManager.set(requestedIdx, NameManager.get(oldIdx));
    }

    if (!connectedClients.some(c => c.assignedIdx === oldIdx)) {
      NameManager.set(oldIdx, 'Aguardando...');
    }

    conn.send({
      type: 'welcome',
      yourIdx: requestedIdx,
      names: NameManager.getAll()
    });

    broadcastNames();
    updateHostLobbyUI();
  }

  seatLock = false;
}

/* ===================== RECONNECT ===================== */

function handleReconnect(conn, data) {
  const idx = data.playerIdx;
  const name = data.name;

  const valid = idx >= 1 && idx < MAX_PLAYERS;
  const samePlayer = NameManager.get(idx) === name;
  const free = !connectedClients.some(c => c.assignedIdx === idx);

  if (valid && (free || samePlayer)) {
    conn.assignedIdx = idx;
    NameManager.set(idx, name);

    // Se já estava na lista (ex: timeout curto), remove o antigo
    connectedClients = connectedClients.filter(c => c !== conn);
    connectedClients.push(conn);

    conn.send({
      type: 'welcome',
      yourIdx: idx,
      names: NameManager.getAll()
    });

    broadcastState();
    updateStatus(`${name} reconectado!`, 'active');
  } else {
    conn.send({ type: 'error', msg: 'Reconexao negada' });
  }
}

/* ===================== BROADCAST ===================== */

function broadcastNames() {
  broadcastToClients({
    type: 'sync_names',
    names: NameManager.getAll()
  });
}

function broadcastToClients(data) {
  connectedClients.forEach(c => {
    if (!c || !c.open) return;
    try {
        c.send(data);
    } catch(e) {
        console.error('Erro ao enviar:', e);
    }
  });
}

function broadcastState() {
  if (netMode !== 'host') return;

  const base = {
    handSize: STATE.handSize,
    extremes: STATE.extremes,
    current: STATE.current,
    scores: STATE.scores,
    isOver: STATE.isOver,
    positions: STATE.positions,
    // Adicione outros campos necessários do STATE aqui
  };

  connectedClients.forEach(conn => {
    if (!conn || !conn.open || conn.assignedIdx === undefined) return;

    const hands = STATE.hands.map((h, i) =>
      i === conn.assignedIdx ? h : []
    );

    conn.send({
      type: 'sync_state',
      state: { ...base, hands },
      names: NameManager.getAll()
    });
  });
}

/* ===================== UI & LOBBY ===================== */

function updateHostLobbyUI() {
  if (typeof SeatManager !== 'undefined' && SeatManager.renderSelectionUI) {
      SeatManager.renderSelectionUI();
  }
  
  const statusEl = document.getElementById('host-status');
  if (statusEl) statusEl.innerText = `Aguardando conexoes... (${connectedClients.length + 1}/4)`;
  const btnStart = document.getElementById('btn-start-multi');
  if (btnStart) btnStart.style.display = (connectedClients.length >= 1) ? 'flex' : 'none'; 
}

/* ===================== CLIENT ===================== */

function handleClientData(data) {
  if (data.type === 'sync_names') { 
      NameManager.updateAll(data.names); 
      renderHands(STATE.isOver); 
      if (netMode === 'client' && typeof SeatManager !== 'undefined') SeatManager.renderSelectionUI();
  }
  if (data.type === 'welcome') { 
      myPlayerIdx = data.yourIdx; 
      if (data.names) NameManager.updateAll(data.names); 
      if (netMode === 'client' && typeof SeatManager !== 'undefined') SeatManager.renderSelectionUI();
  }
  
  if (data.type === 'game_start') { 
    myPlayerIdx = data.yourIdx; 
    if (data.names) NameManager.updateAll(data.names); 
    const startScreen = document.getElementById('start-screen'); 
    if (startScreen) startScreen.style.display = 'none'; 
    updateScoreDisplay();

    const picker = document.getElementById('side-picker');
    if (picker) picker.style.display = 'none';
    
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
    STATE.positions = hostState.positions || [];
    
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
  if (data.type === 'error') {
      alert(data.msg);
      window.location.reload();
  }
}

function connectToHost() {
  if (typeof Peer === 'undefined') return;
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  const statusEl = document.getElementById('client-status');

  if (input.length < 5) {
      if (statusEl) statusEl.innerText = "Codigo invalido";
      return;
  }
  
  if (statusEl) statusEl.innerText = "Conectando...";

  if (myPeer) myPeer.destroy();
  
  lastRoomCode = 'domino-' + input;
  myPeer = new Peer(); 
  
  myPeer.on('error', (err) => {
    console.error("Peer error:", err);
    if (statusEl) statusEl.innerText = "Erro: " + (err.type === 'peer-unavailable' ? "Sala nao encontrada" : err.type);
    tentarReconectar();
  });

  myPeer.on('open', () => {
    myConnToHost = myPeer.connect(lastRoomCode);
    
    myConnToHost.on('data', handleClientData);
    
    myConnToHost.on('open', () => {
        if (statusEl) statusEl.innerText = "Conectado";
        myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
    });

    myConnToHost.on('close', tentarReconectar);
    myConnToHost.on('error', tentarReconectar);
  });
}

function tentarReconectar() {
    if (reconnectTimer) return;
    
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.warn("Maximo de tentativas de reconexao atingido.");
        return;
    }
    
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (typeof Peer === 'undefined') return;
        
        if (myPeer) myPeer.destroy();
        myPeer = new Peer();
        
        myPeer.on('open', () => {
            myConnToHost = myPeer.connect(lastRoomCode);
            myConnToHost.on('data', handleClientData);
            myConnToHost.on('open', () => {
                reconnectAttempts = 0;
                myConnToHost.send({ type: 'reconnect', name: NameManager.get(0), playerIdx: myPlayerIdx });
            });
        });
    }, RECONNECT_DELAY_MS);
}
