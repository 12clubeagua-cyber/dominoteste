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
  
  // Exibe o código logo após gerar, antes da inicialização do Peer
  const codeEl = document.getElementById('host-code-display');
  if (codeEl) {
      codeEl.innerText = roomCode.split('-')[1];
      console.log("Code displayed:", codeEl.innerText);
  } else {
      console.error("host-code-display element NOT FOUND");
  }
  
  // O Peer ID deve ser o código completo (DOMINO-XXXXX)
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
    if (connectedClients.length >= 3) {
      conn.send({ type: 'error', msg: 'Sala cheia!' });
      setTimeout(() => conn.close(), 500);
      return;
    }
    
    conn.on('open', () => {
      // Assentos: Host=0, 1º cliente=2 (parceiro), 2º cliente=1, 3º cliente=3
      conn.assignedIdx = connectedClients.length === 0 ? 2 : connectedClients.length === 1 ? 1 : 3;
      
      connectedClients.push(conn);
      updateHostLobbyUI();
      conn.send({ type: 'welcome', msg: 'Conectado! Aguarde o host.', yourIdx: conn.assignedIdx, names: NameManager.getAll() });
    });
    
    conn.on('data', (data) => {
      if (data.type === 'set_name') {
          NameManager.set(conn.assignedIdx, data.name);
          // BUG CORRIGIDO: atualiza lobby UI com nome recebido
          updateHostLobbyUI();
          broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
      }
      if (data.type === 'play_request' && STATE.current === conn.assignedIdx) {
          play(conn.assignedIdx, data.tIdx, data.side);
      }
      if (data.type === 'next_round_request' && STATE.isOver) startRound();
    });

    
    conn.on('close', () => {
      const disconnectedIdx = conn.assignedIdx;
      connectedClients = connectedClients.filter(c => c.peer !== conn.peer);
      updateHostLobbyUI();
      
      if (netMode === 'host' && !STATE.isOver) {
        broadcastState();
        if (STATE.current === disconnectedIdx) {
          processTurn();
        }
      }
    });
  });
}

function updateHostLobbyUI() {
  const countEl = document.getElementById('host-status');
  if (countEl) countEl.innerText = `Jogadores: ${connectedClients.length}/3`;
  const list = document.getElementById('host-player-list');
  if (!list) return;
  list.innerHTML = `<div class="player-item">Você — ${NameManager.get(0)} (Host)</div>`;
  connectedClients.forEach((conn) => {
    const el = document.createElement('div');
    el.className = 'player-item';
    // BUG CORRIGIDO: mostra o nome real do cliente se já foi recebido
    const playerName = NameManager.get(conn.assignedIdx);
    el.innerText = playerName && playerName !== `JOGADOR ${conn.assignedIdx + 1}` && !playerName.startsWith('ROBO')
      ? playerName
      : `Aguardando jogador...`;
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
  if (netMode === 'host') broadcastToClients({ type: 'sync_state', state: STATE, names: NameManager.getAll() });
}

function connectToHost() {
  const input = document.getElementById('join-code-input').value.toUpperCase().trim();
  if (input.length < 5) return;

  const statusEl = document.getElementById('client-status');
  if (statusEl) statusEl.innerText = "Conectando...";
  
  if (myPeer) myPeer.destroy();
  myPeer = new Peer(); 
  
  myPeer.on('open', () => {
    console.log("Peer opened. Connecting to:", 'DOMINO-' + input);
    myConnToHost = myPeer.connect('DOMINO-' + input);
    
    myConnToHost.on('open', () => {
        console.log("Connection opened!");
        if (statusEl) statusEl.innerText = "Aguardando início...";
        myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
    });

    myConnToHost.on('error', (err) => {
        console.error("Connection error:", err);
        if (statusEl) statusEl.innerText = "Erro na conexão: " + err.type;
    });
    
    myConnToHost.on('data', (data) => {
      if (data.type === 'sync_names') {
          NameManager.updateAll(data.names);
          renderHands(STATE.isOver); 
      }
      if (data.type === 'welcome') {
        myPlayerIdx = data.yourIdx;
        if (data.names) {
            NameManager.updateAll(data.names);
        }
      }
      if (data.type === 'game_start') {
        myPlayerIdx = data.yourIdx;
        if (data.names) {
            NameManager.updateAll(data.names);
        }
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        updateScoreDisplay(); 
      }
      if (data.type === 'shuffle_start') runShuffleAnimation();
      
      if (data.type === 'sync_state') {
        if (data.names) {
            NameManager.updateAll(data.names);
        }
        
        // Sincronização robusta: Compara as mãos antes de aplicar alterações para evitar flicker
        const isHandsConsistent = JSON.stringify(STATE.hands) === JSON.stringify(data.state.hands);
        
        if (!isHandsConsistent) {
             console.log("Sincronizando estado do jogo com Host.");
             STATE.hands = [...data.state.hands];
             STATE.handSize = [...data.state.handSize];
             client_predicted = false;
        }

        // Atualiza o restante do estado, excluindo mãos que já tratamos acima
        const { hands, handSize, ...others } = data.state;
        Object.assign(STATE, others);

        updateScoreDisplay();
        renderBoardFromState(); 
        renderHands(STATE.isOver); 
        updateSnakeScale();

        // Dispara o processTurn no cliente após um curto delay para garantir renderização
        if (!STATE.isOver) {
            setTimeout(processTurn, 100);
        }
      }
      
      if (data.type === 'animate_play') {
         client_predicted = false;
         
         // Adiciona a posição localmente para garantir consistência visual imediata
         const alreadyExists = STATE.positions.some(p => p.x === data.nP.x && p.y === data.nP.y);
         if (!alreadyExists) {
            STATE.positions.push(data.nP);
         }
         
         animateTile(data.pIdx, data.nP, () => {
            renderBoardFromState(); 
         });
      }
      
      if (data.type === 'status') updateStatusLocal(data.text, data.cls);
      
      if (data.type === 'animate_pass') {
          // Apenas visual: não altera o estado do jogo (STATE), pois isso é tarefa do Host.
          triggerPassVisual(data.pIdx);
          playPass();
      }
      
      if (data.type === 'end_round') executeEndRoundUI(data.winTeam, data.idx, data.msg);
    });
    
    myConnToHost.on('close', () => {
      alert("Conexão com o Host perdida.");
      window.location.reload();
    });

    myPeer.on('error', (err) => {
      console.error("PeerJS Error:", err);
      if (statusEl) statusEl.innerText = "Erro na conexão.";
    });
  });
}
