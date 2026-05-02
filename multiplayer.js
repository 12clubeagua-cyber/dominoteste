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
      const taken = connectedClients.map(c => c.assignedIdx);
      for (let i = 1; i <= 3; i++) {
          if (!taken.includes(i)) {
              conn.assignedIdx = i;
              break;
          }
      }
      
      connectedClients.push(conn);
      updateHostLobbyUI();
      conn.send({ type: 'welcome', msg: 'Conectado! Aguarde o host.', yourIdx: conn.assignedIdx, names: NAMES });
    });
    
    conn.on('data', (data) => {
      if (data.type === 'set_name') {
          NAMES[conn.assignedIdx] = data.name;
          broadcastToClients({ type: 'sync_names', names: NAMES });
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
    console.log("Peer opened. Connecting to:", 'DOMINO-' + input);
    myConnToHost = myPeer.connect('DOMINO-' + input);
    
    myConnToHost.on('open', () => {
        console.log("Connection opened!");
        if (statusEl) statusEl.innerText = "Aguardando início...";
        myConnToHost.send({ type: 'set_name', name: NAMES[0] });
    });

    myConnToHost.on('error', (err) => {
        console.error("Connection error:", err);
        if (statusEl) statusEl.innerText = "Erro na conexão: " + err.type;
    });
    
    myConnToHost.on('data', (data) => {
      if (data.type === 'sync_names') {
          data.names.forEach((name, i) => { NAMES[i] = name; });
          renderHands(STATE.isOver); // Re-renderiza para atualizar os nomes na tela
      }
      if (data.type === 'welcome') {
        myPlayerIdx = data.yourIdx;
      }
      if (data.type === 'game_start') {
        myPlayerIdx = data.yourIdx;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        updateScoreDisplay(); 
      }
      if (data.type === 'shuffle_start') runShuffleAnimation();
      
      if (data.type === 'sync_state') {
        // Correção: Verifica se a mão local é consistente com o servidor
        const isConsistent = JSON.stringify(STATE.hands[myPlayerIdx]) === JSON.stringify(data.state.hands[myPlayerIdx]);
        
        if (!client_predicted && !isConsistent) {
            Object.assign(STATE, data.state);
        } else {
            // Apenas atualiza o resto, mantendo a mão local se a previsão estiver em curso
            const { hands, ...others } = data.state;
            Object.assign(STATE, others);
        }

        updateScoreDisplay();
        renderBoardFromState(); 
        renderHands(STATE.isOver); 
        updateSnakeScale();

        // Se for a vez deste cliente após o sync, habilita as jogadas
        if (STATE.current === myPlayerIdx && !STATE.isOver) {
           STATE.isBlocked = false; 
           const moves = getMoves(STATE.hands[myPlayerIdx]);
           if (moves.length > 0) highlight(moves);
        }
      }
      
      if (data.type === 'animate_play') {
         // Se eu sou o autor da jogada e já previ ela localmente, não preciso tirar da mão de novo
         if (data.pIdx === myPlayerIdx) {
            if (!client_predicted) {
              STATE.hands[data.pIdx].splice(data.tIdx, 1);
              STATE.handSize[data.pIdx]--;
            }
         } else {
            // Outro jogador jogou. Remove uma peça genérica da mão dele (pop)
            STATE.hands[data.pIdx].pop(); 
            STATE.handSize[data.pIdx]--;
         }
         
         client_predicted = false;
         renderHands();

         // Adiciona a posição localmente para garantir consistência visual imediata
         // Verificamos se já não existe (para evitar duplicatas em latência zero)
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
          playPass(); // CORREÇÃO: Som toca agora no cliente também
          triggerPassVisual(data.pIdx);
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
