/* 
    LOGICA PEERJS (multiplayer.js) - VERSÃO OTIMIZADA
    Alterações implementadas: Código curto, Logs detalhados, Reconexão automática.
*/

// --- CONFIGURAÇÕES E VARIÁVEIS DE CONTROLE ---
// Variável que guarda o último código de sala acessado para uso em reconexões
let lastRoomCode = '';
// Variável que conta quantas vezes o sistema já tentou reconectar sem sucesso
let reconnectAttempts = 0;
// Constante que define o limite máximo de tentativas de reconexão antes de desistir
const MAX_RECONNECT_ATTEMPTS = 5;
// Constante que define o tempo de espera (intervalo) entre cada tentativa de reconexão
const RECONNECT_DELAY_MS = 2000;
// Variável para armazenar o relógio temporizador da reconexão, permitindo cancelá-lo se necessário
let reconnectTimer = null;

/**
 * Função responsável por gerar o identificador (código) único para a sala
 */
function generateShortID() {
    // Define a lista de caracteres (alfabeto) disponíveis para o sorteio
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // Inicializa a variável que vai guardar o resultado final vazia
    let result = '';
    // Loop que roda a quantidade de vezes definida para sortear as letras do código
    for (let i = 0; i < 1; i++) {
        // Sorteia uma posição aleatória da string de caracteres e adiciona ao resultado
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Retorna o resultado final concatenado com o prefixo do jogo para uso interno do servidor
    return 'domino-' + result;
}

/**
 * Função que inicializa o jogador atual como o Host (Dono da Sala)
 */
function initializeHost() {
    // Aborta a inicialização se a biblioteca do servidor (PeerJS) não estiver carregada na página
    if (typeof Peer === 'undefined') return;
    // Se já existir uma conexão ativa aberta anteriormente, destrói para começar do zero
    if (myPeer) myPeer.destroy();

    // Chama a função para gerar o código da nova sala
    const roomCode = generateShortID();
    // Extrai e salva apenas a parte aleatória (sem o prefixo) na variável global
    lastRoomCode = roomCode.split('-')[1]; 

    // Busca o elemento na tela onde o código deve ser exibido para os amigos
    const codeEl = document.getElementById('host-code-display');
    // Se o elemento existir, injeta o texto do código gerado nele
    if (codeEl) codeEl.innerText = lastRoomCode;

    // Cria a nova instância do servidor local usando o código completo como identificador
    myPeer = new Peer(roomCode);

    // Evento disparado quando o servidor é criado e aberto com sucesso na rede
    myPeer.on('open', (id) => {
        // Exibe uma mensagem de sucesso no painel do desenvolvedor
        console.log(`[HOST] Sala criada com sucesso! ID: ${lastRoomCode}`);
        // Busca o botão de iniciar a partida na interface
        const btn = document.getElementById('btn-start-multi');
        // Torna o botão visível na tela
        if (btn) btn.style.display = 'flex';
    });

    // Evento disparado caso ocorra algum erro na criação ou manutenção do servidor
    myPeer.on('error', (err) => {
        // Exibe o tipo do erro no painel do desenvolvedor
        console.error("[HOST] Erro no Peer:", err.type);
        // Se o erro for de código indisponível (alguém no mundo já está usando essa mesma letra/código)
        if (err.type === 'unavailable-id') {
            // Avisa o usuário que houve um conflito
            alert("Código de sala já em uso. Tentando gerar outro...");
            // Recarrega a página para o fluxo tentar criar um novo código automaticamente
            window.location.reload();
        }
    });

    // Evento disparado sempre que um outro jogador (cliente) tenta entrar na sala
    myPeer.on('connection', (conn) => {
        // Inicializa a variável que vai procurar um assento livre com um valor inválido por padrão
        let freeIdx = -1;
        // Loop para vasculhar as posições dos convidados (ignorando o índice do próprio Host)
        for (let i = 1; i <= 3; i++) {
            // Se não encontrar ninguém na lista atual de conectados ocupando este assento
            if (!connectedClients.some(c => c.assignedIdx === i)) {
                // Marca este assento como o livre
                freeIdx = i;
                // Interrompe a busca, pois já achou a vaga
                break;
            }
        }

        // Se o índice livre continuar inválido, significa que todos os assentos estão ocupados
        if (freeIdx === -1) {
            // Assim que a conexão do intruso for estabelecida...
            conn.on('open', () => {
                // ...envia uma mensagem de erro avisando que a sala está cheia
                conn.send({ type: 'error', msg: 'Sala cheia!' });
                // Aguarda um breve instante para a mensagem chegar e encerra a conexão na cara dele
                setTimeout(() => conn.close(), 100);
            });
            // Aborta a continuação do código para este cliente rejeitado
            return;
        }

        // Se houver vaga, vincula o índice do assento livre a esta nova conexão
        conn.assignedIdx = freeIdx;
        // Adiciona este cliente à lista oficial de jogadores conectados
        connectedClients.push(conn);

        // Quando o canal de dados desta nova conexão estiver pronto para uso
        conn.on('open', () => {
            // Envia um pacote de boas-vindas informando qual é o assento dele e quem mais está na sala
            conn.send({ type: 'welcome', yourIdx: conn.assignedIdx, names: NameManager.getAll() });
            // Define um nome genérico inicial para ele no gerenciador de nomes
            NameManager.set(conn.assignedIdx, `Jogador ${conn.assignedIdx}`);
            // Atualiza a tela da sala de espera do Host para mostrar que alguém entrou
            updateHostLobbyUI();
            // Dispara para todos os outros clientes a nova lista de nomes atualizada
            broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
        });

        // Evento disparado sempre que o Host recebe pacotes de dados deste cliente específico
        conn.on('data', (data) => {
            // Registra no painel se o pacote recebido foi um pedido de jogada de peça
            if (data.type === 'play_request') console.log(`[HOST] Jogada recebida do Player ${conn.assignedIdx}`);

            // Se o pacote for um pedido para alterar o apelido
            if (data.type === 'set_name') {
                // Atualiza o nome associado a este jogador no sistema
                NameManager.set(conn.assignedIdx, data.name);
                // Atualiza a interface do Host
                updateHostLobbyUI();
                // Replica a nova lista de nomes para todo mundo da sala
                broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
            }

            // Se o pacote for um pedido para trocar de cadeira na sala de espera
            if (data.type === 'request_seat') {
                // Pega o número da cadeira desejada
                const requestedIdx = data.seatIdx;
                // Verifica se a cadeira desejada não é a do Host e se está realmente vazia
                const isAvailable = (requestedIdx !== 0) && !connectedClients.some(c => c.assignedIdx === requestedIdx);
                // Se a cadeira estiver livre
                if (isAvailable) {
                    // Guarda o número da cadeira antiga deste cliente
                    const oldIdx = conn.assignedIdx;
                    // Move o cliente para a cadeira nova
                    conn.assignedIdx = requestedIdx;
                    // Lógica para preservar o nome: se era o genérico antigo, muda pro genérico novo
                    if (NameManager.get(oldIdx) === `Jogador ${oldIdx}`) {
                        NameManager.set(requestedIdx, `Jogador ${requestedIdx}`);
                    } else {
                        // Se for um apelido personalizado, transfere o apelido pra cadeira nova
                        NameManager.set(requestedIdx, NameManager.get(oldIdx));
                    }
                    // Libera a cadeira antiga marcando como vazia
                    NameManager.set(oldIdx, 'Aguardando...');
                    // Reenvia as boas-vindas para o cliente confirmar que mudou de lugar
                    conn.send({ type: 'welcome', yourIdx: requestedIdx, names: NameManager.getAll() });
                    // Atualiza a tela local do Host
                    updateHostLobbyUI();
                    // Sincroniza a mudança visual para todos os outros da sala
                    broadcastToClients({ type: 'sync_names', names: NameManager.getAll() });
                }
            }

            // Se o pacote for uma tentativa de retornar após a internet cair
            if (data.type === 'reconnect') {
                // Registra a tentativa no log do desenvolvedor
                console.log(`[HOST] Tentativa de reconexão: ${data.name} (ID sugerido: ${data.playerIdx})`);
                // Pega a cadeira que o jogador dizia ocupar antes de cair
                const requestedIdx = data.playerIdx;
                // Verifica se de fato não tem ninguém ocupando essa cadeira agora
                const seatFree = !connectedClients.some(c => c.assignedIdx === requestedIdx);
                // Se a cadeira estiver vazia e for um número de convidado válido
                if (seatFree && [1, 2, 3].includes(requestedIdx)) {
                    // Devolve a cadeira para o cliente reconectado
                    conn.assignedIdx = requestedIdx;
                    // Restaura o apelido dele no sistema
                    NameManager.set(requestedIdx, data.name);
                    // Dispara o estado atual do tabuleiro para ele ver como a partida está
                    broadcastState();
                    // Exibe a mensagem verde na tela avisando que ele voltou
                    updateStatus(`${data.name} reconectado!`, 'active');
                }
            }

            // Se for um pedido de jogada E for o turno exato daquele jogador, executa a jogada na mesa
            if (data.type === 'play_request' && STATE.current === conn.assignedIdx) play(conn.assignedIdx, data.tIdx, data.side);
            // Se for um pedido pra iniciar próxima rodada e a atual já tiver acabado, inicia o round
            if (data.type === 'next_round_request' && STATE.isOver) startRound();
        });

        // Evento disparado se a conexão com este cliente for fechada ou perdida
        conn.on('close', () => {
            // Registra um aviso amarelo no log indicando a queda
            console.warn(`[HOST] Cliente ${conn.assignedIdx} desconectou.`);
            // Remove este cliente da lista de conexões ativas
            connectedClients = connectedClients.filter(c => c !== conn);
            // Zera o apelido da cadeira dele na interface
            NameManager.set(conn.assignedIdx, 'Aguardando...');
            // Atualiza a tela de espera se estiverem lá
            updateHostLobbyUI();
            // Se a partida estiver em andamento (não acabou ainda)
            if (!STATE.isOver) {
                // Congela a mesa para ninguém mais jogar
                STATE.isBlocked = true;
                // Exibe uma mensagem vermelha avisando sobre a queda e a pausa
                updateStatus(`Jogador ${conn.assignedIdx} caiu. Pausado.`, 'pass');
            }
        });
    });
}

/**
 * Função utilizada pelo Host para transmitir todo o estado atual da mesa para os clientes
 */
function broadcastState() {
    // Trava de segurança: só permite a execução se quem estiver rodando for o dono da sala
    if (netMode !== 'host') return;
    // Variável que vai guardar a cópia segura dos dados
    let anonymizedState;
    try {
        // Cria uma cópia independente e profunda do estado do jogo (evita alterar o original por acidente)
        anonymizedState = JSON.parse(JSON.stringify(STATE));
    } catch (e) { return; } // Se a cópia falhar, aborta a transmissão silenciosamente

    // Passa por cada cliente conectado na sala
    connectedClients.forEach(conn => {
        // Ignora conexões inválidas, fechadas ou sem assento definido
        if (!conn || !conn.open || conn.assignedIdx === undefined) return;
        // Pega qual é a cadeira deste cliente específico do loop
        const clientIdx = conn.assignedIdx;
        // Oculta as mãos inimigas: Substitui as peças dos outros por arrays vazios para evitar trapaças
        const filteredHands = anonymizedState.hands.map((hand, idx) => (idx === clientIdx ? hand : []));
        
        // Dispara o pacote de sincronização contendo o tabuleiro e a mão censurada para este cliente
        conn.send({ 
            type: 'sync_state', 
            state: { ...anonymizedState, hands: filteredHands }, 
            names: NameManager.getAll() 
        });
    });
}

/**
 * Função que os Clientes usam para reagir às mensagens e comandos enviados pelo Host
 */
function handleClientData(data) {
    // Se o pacote for do tipo Sincronização Geral
    if (data.type === 'sync_state') {
        // Log para ajudar a rastrear se houve desincronização de placar no momento da queda
        console.log(`[CLIENTE] Sincronização recebida. Placar: ${data.state.scores[0]} - ${data.state.scores[1]}`);
        
        // Se vieram nomes novos, atualiza a agenda local
        if (data.names) NameManager.updateAll(data.names);
        // Se havia algum relógio rodando para o turno anterior, cancela ele
        if (STATE.turnTimer) clearTimeout(STATE.turnTimer);
        // Se o cliente ainda não sabe qual é o próprio assento, ignora os dados do tabuleiro
        if (myPlayerIdx === undefined || myPlayerIdx === null) return;

        // Extrai o objeto de estado recebido do host
        const hostState = data.state;
        // Substitui a mão local pelas mãos censuradas enviadas pelo servidor
        STATE.hands = hostState.hands || [[],[],[],[]];
        // Sincroniza a quantidade de peças que cada um tem
        STATE.handSize = hostState.handSize || [7,7,7,7];
        // Sincroniza as pontas expostas na mesa
        STATE.extremes = hostState.extremes || [null, null];
        // Sincroniza de quem é a vez de jogar
        STATE.current = hostState.current ?? 0;
        // Sincroniza o placar das equipes
        STATE.scores = hostState.scores || [0, 0];
        // Sincroniza se a partida está rolando ou já encerrou
        STATE.isOver = hostState.isOver ?? false;

        // Atualiza os números do placar visual
        updateScoreDisplay();
        // Redesenha as peças jogadas no feltro verde
        renderBoardFromState();
        // Atualiza a exibição das mãos e das cartas viradas
        renderHands(STATE.isOver);
        // Ajusta a câmera (zoom/pan) para focar no tabuleiro novo
        updateSnakeScale();

        // Se o jogo está rolando e o servidor disse que agora é a SUA vez
        if (!STATE.isOver && STATE.current === myPlayerIdx) {
            // Destranca a interface para o jogador local clicar
            STATE.isBlocked = false;
            // Chama a rotina de iniciar o turno após uma leve pausa imperceptível
            setTimeout(processTurn, 100);
        // Se não for a sua vez, mas o jogo continua
        } else if (!STATE.isOver) {
            // Trava sua tela
            STATE.isBlocked = true;
            // Mostra o nome de quem está pensando na barra
            updateStatusLocal(`${NameManager.get(STATE.current)} JOGANDO...`);
        }
    }

    // Se o pacote for a recepção oficial na sala
    if (data.type === 'welcome') {
        // Grava na memória qual cadeira o servidor te deu
        myPlayerIdx = data.yourIdx;
        // Exibe no console para facilitar a manutenção
        console.log(`[CLIENTE] Bem-vindo! Meu índice é: ${myPlayerIdx}`);
        // Atualiza os apelidos com base no que o servidor mandou
        if (data.names) NameManager.updateAll(data.names);
        // Renderiza as opções de trocar de lugar se estiver no modo correto e o construtor existir
        if (netMode === 'client' && typeof SeatManager !== 'undefined') SeatManager.renderSelectionUI();
    }

    // Se o Host deu a ordem de iniciar o jogo e limpar os menus
    if (data.type === 'game_start') {
        // Registra o início no log
        console.log("[CLIENTE] Partida iniciada!");
        // Confirma seu lugar na mesa novamente
        myPlayerIdx = data.yourIdx;
        // Busca a camada de menus iniciais
        const startScreen = document.getElementById('start-screen');
        // Esconde os menus para revelar o tabuleiro por baixo
        if (startScreen) startScreen.style.display = 'none';
        // (O reset completo do STATE ficaria aqui para preparar a mesa)
    }

    // Se o Host mandar tocar a animação de uma peça voando
    if (data.type === 'animate_play') {
        // Verifica se essa exata peça (coordenadas X e Y) já não foi processada para não desenhar duas vezes
        const alreadyExists = STATE.positions.some(p => p.x === data.nP.x && p.y === data.nP.y);
        // Se é nova, adiciona no controle local de posições
        if (!alreadyExists) STATE.positions.push(data.nP);
        // Aciona o motor visual de voo da peça e, quando acabar, força o redesenho da mesa
        animateTile(data.pIdx, data.nP, () => { renderBoardFromState(); });
    }
    
    // Se o Host avisar que a rodada acabou (alguém bateu ou trancou)
    if (data.type === 'end_round') {
        // Mostra quem foi a equipe vitoriosa no console
        console.log(`[CLIENTE] Fim da rodada! Vencedor Time: ${data.winTeam}`);
        // Executa as animações visuais de encerramento, placar e revelação de mãos
        executeEndRoundUI(data.winTeam, data.idx, data.msg);
    }
}

/**
 * Função acionada pelo usuário Cliente para tentar plugar em uma sala existente
 */
function connectToHost() {
    // Aborta se o PeerJS não estiver carregado
    if (typeof Peer === 'undefined') return;
    // Captura o que foi digitado, remove espaços em branco das pontas e força tudo para maiúsculo
    const input = document.getElementById('join-code-input').value.toUpperCase().trim();
    
    // Verifica se a quantidade de caracteres atende à exigência mínima configurada
    if (input.length < 1) return;
    
    // Busca o elemento de texto que dá feedback visual abaixo do botão
    const statusEl = document.getElementById('client-status');
    // Mostra que a requisição de rede começou
    if (statusEl) statusEl.innerText = "Conectando...";

    // Se existia uma rede velha travada na memória, destrói para criar conexão nova e limpa
    if (myPeer) myPeer.destroy();
    // Cria a nova conexão do cliente (como cliente, ele não exige código fixo no parâmetro)
    myPeer = new Peer(); 

    // Se o motor de rede do cliente der algum erro
    myPeer.on('error', (err) => {
        // Registra o tipo do erro
        console.error("[PEER ERRO]", err);
        // Se for erro de alvo inexistente, avisa que a sala não existe, senão exibe o erro bruto
        if (statusEl) statusEl.innerText = "Erro: " + (err.type === 'peer-unavailable' ? "Sala não encontrada" : err.type);
    });

    // Quando a linha telefônica do cliente estiver estabelecida e pronta para discar
    myPeer.on('open', () => {
        // Salva o código que o jogador digitou para caso a internet caia no meio do jogo
        lastRoomCode = input; 
        // Disca (conecta) ativamente para o código reconstruído do Host
        myConnToHost = myPeer.connect('domino-' + input);

        // Prepara para ouvir todos os dados enviados por esse Host e direciona para o interpretador
        myConnToHost.on('data', handleClientData);

        // Se o evento de fechamento de conexão disparar (Host saiu, Wi-Fi caiu, tela bloqueou)
        myConnToHost.on('close', () => {
            // Log amarelo avisando sobre a queda da linha
            console.warn("[REDE] Conexão fechada inesperadamente.");
            // Imprime o estado da mesa no momento da morte para ajudar a descobrir se o jogo encerrou a conexão de propósito
            console.log(`[DEBUG] No fechamento: Placar ${STATE.scores} | isOver: ${STATE.isOver}`);
            
            // Muda o texto na tela para tranquilizar o usuário de que o robô está trabalhando
            if (statusEl) statusEl.innerText = "Conexão perdida. Reconectando...";
            
            // Aciona o motor de reparo automático de linha em vez de reiniciar a página inteira
            tentarReconectar();
        });

        // Quando o host finalmente atender o "telefone"
        myConnToHost.on('open', () => {
            // Zera o contador de falhas já que conseguiu se ligar com sucesso
            reconnectAttempts = 0; 
            // Log confirmando a união das pontas
            console.log("[REDE] Conexão aberta com o Host.");
            // Atualiza o aviso de texto
            if (statusEl) statusEl.innerText = "Conectado!";
            // Envia imediatamente o pacote de apresentação contendo o apelido escolhido
            myConnToHost.send({ type: 'set_name', name: NameManager.get(0) });
        });
    });
}

/**
 * Motor automático responsável por tentar restabelecer o link sem perder o estado da mesa
 */
function tentarReconectar() {
    // Se já tinha um timer de reconexão correndo, cancela para não encavalar processos
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    // Aumenta o contador de tentativas
    reconnectAttempts++;
    // Log mostrando qual tentativa está rolando agora
    console.log(`[RECONEXÃO] Tentativa ${reconnectAttempts} de ${MAX_RECONNECT_ATTEMPTS}...`);

    // Se o contador ultrapassou a quantidade máxima permitida de insistência
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        // Registra o fracasso total no console
        console.error("[RECONEXÃO] Limite de tentativas excedido.");
        // Abre um aviso na tela comunicando o jogador da morte do link
        alert("Não foi possível reconectar à sala.");
        // E aí sim forçamos o recarregamento da página voltando para a estaca zero
        window.location.reload(); 
        // Aborta a função atual
        return;
    }

    // Cria o agendamento de uma nova tentativa com base no tempo de intervalo configurado
    reconnectTimer = setTimeout(() => {
        // Zera o rastreador do timer assim que ele ativa
        reconnectTimer = null;
        // Trava se a biblioteca sumiu
        if (typeof Peer === 'undefined') return;

        // Recria toda a estrutura do telefone do zero para limpar lixo de memória
        myPeer = new Peer();
        // Quando a rede autorizar esse novo telefone
        myPeer.on('open', () => {
            // Log da nova tentativa
            console.log(`[RECONEXÃO] Peer aberto, tentando vincular a domino-${lastRoomCode}`);
            // Pede pra ligar de novo pro código salvo em memória
            myConnToHost = myPeer.connect('domino-' + lastRoomCode);
            
            // Reinstala o ouvinte de comandos do host
            myConnToHost.on('data', handleClientData);
            // Se o host atender dessa vez
            myConnToHost.on('open', () => {
                // Log festivo
                console.log("[RECONEXÃO] Sucesso! Enviando pacote de restauração...");
                // Reseta a contagem de sofrimento
                reconnectAttempts = 0;
                // Dispara o pacote especial exigindo a cadeira velha de volta sem perder as peças
                myConnToHost.send({ 
                    type: 'reconnect', 
                    name: NameManager.get(0), 
                    playerIdx: myPlayerIdx 
                });
            });

            // Se voltar a cair logo depois, reativa esta própria função (Recursividade do mal)
            myConnToHost.on('close', tentarReconectar);
        });
    }, RECONNECT_DELAY_MS);
}

/**
 * Funções auxiliares focadas em desenhar interfaces relacionadas ao multiplayer
 */
function updateHostLobbyUI() {
    // Se o arquivo de assentos estiver carregado, manda ele atualizar os quadrados com os nomes
    if (typeof SeatManager !== 'undefined' && SeatManager.renderSelectionUI) SeatManager.renderSelectionUI();
    // Busca o texto que contabiliza o número de pessoas conectadas
    const statusEl = document.getElementById('host-status');
    // Atualiza a frase mostrando a quantidade da lista mais o próprio host contra o limite fixo da mesa
    if (statusEl) statusEl.innerText = `Aguardando conexões... (${connectedClients.length + 1}/4)`;
    // Puxa o botão que só o host tem (de dar START no jogo)
    const btnStart = document.getElementById('btn-start-multi');
    // A regra diz: O botão só fica visível se houver PELO MENOS a quantidade exigida de convidados, senão some
    if (btnStart) btnStart.style.display = (connectedClients.length >= 1) ? 'flex' : 'none'; 
}

/**
 * Utilitário tipo "Megafone" usado pelo Host para disparar a mesma mensagem para a lista toda de uma vez
 */
function broadcastToClients(data) {
    // Passa por todos na lista de clientes conectados
    connectedClients.forEach(client => {
        // Confirma se o elemento existe e se o tubo de conexão ainda está íntegro e aberto
        if (client && client.open) {
            // Tenta forçar o envio da mensagem...
            try { client.send(data); } 
            // Mas se falhar ou crachar nesse cliente específico, avisa no log sem deixar o loop quebrar os outros
            catch(e) { console.error('Erro de envio:', e); }
        }
    });
}
