/* 
   ESTADO GLOBAL E CONFIGURACOES (state.js)
 */

// Criação do objeto global STATE que atua como o banco de dados principal de uma rodada
let STATE = {
  // Matriz (lista de listas) que armazena as peças que estão nas mãos de cada um dos 4 jogadores
  hands: [[], [], [], []],                
  // Armazena os números das duas pontas livres na mesa de dominó para saber o que pode ser jogado
  extremes: [null, null],   
  // Variável que guarda o índice do jogador (0 a 3) que deve realizar a jogada neste exato momento
  current: 0,               
  // Placar do jogo: índice 0 é a pontuação da Dupla A, índice 1 é a pontuação da Dupla B
  scores: [0, 0],           
  // Memória temporária que guarda o índice de uma peça quando o jogador precisa escolher se quer jogar na "Cima" ou "Baixo"
  pendingIdx: null,         
  // Trava de segurança global. Se for verdadeira, a interface ignora os cliques do usuário (Ex: durante animações)
  isBlocked: false,         
  // Indica se a rodada atual terminou (alguém bateu ou a mesa trancou)
  isOver: false,            
  // Sinalizador ("flag") para indicar se a partida completa (o jogo todo, ex: chegou a 5 pontos) terminou
  matchOver: false,         // New flag for entire match termination
  // Indica se o jogo está no meio da animação inicial de embaralhar as peças
  isShuffling: false,       
  // Guarda o índice do jogador que venceu a última rodada para que ele comece jogando a próxima
  roundWinner: null,        
  // Registra o índice da última pessoa que conseguiu colocar uma peça na mesa (usado como critério de desempate se trancar)
  lastPlayed: null,         
  // Histórico matemático completo contendo a coordenada (X e Y) e o formato de todas as peças já colocadas no tabuleiro
  positions: [],            
  // Contador global de quantas vezes os jogadores "passaram a vez" em sequência
  passCount: 0,             
  // Lista que marca "verdadeiro" ou "falso" para indicar individualmente se cada jogador passou a vez naquela rodada de lances
  playerPassed: [false, false, false, false],
  // Objetos que guardam a geometria e os cálculos de direção das "cobrinhas" crescendo nas duas pontas da mesa
  ends: [],                 
  // Inteligência/Memória da mesa: Guarda os números em que cada jogador já passou a vez para a IA ou outras lógicas usarem
  playerMemory: [[], [], [], []], 
  // Cache de performance que guarda quantas peças restam na mão de cada jogador sem precisar inspecionar a mão real
  handSize: [7, 7, 7, 7],   
  // Pontuação necessária estipulada no menu para declarar um vencedor definitivo da partida inteira
  targetScore: 1,           
  // Nível da inteligência artificial escolhida para os oponentes do computador no modo offline
  difficulty: 'normal',     
  // Armazena o ID do cronômetro ("timer" que roda a cada segundo) que avança de uma rodada encerrada para a próxima
  autoNextInterval: null,
  // Armazena o ID do temporizador que aguarda o "delay" do turno (ex: o robô pensando) para podermos cancelar se preciso
  turnTimer: null    // Timer for pending turn execution
};

// Contexto de audio (iniciado apos o primeiro clique do usuario)
// Preparação da Web Audio API (O navegador exige que fique nula até o jogador clicar fisicamente na tela pela 1ª vez)
let audioCtx = null;

// Variaveis de Rede / Multiplayer
// Variável que diz ao jogo como ele deve se comportar: contra a máquina, criando sala ou conectando na de um amigo
let netMode = 'offline';      // 'offline', 'host' ou 'client'
// Variável que guarda o assento deste dispositivo na mesa (Se você for o Host, sempre será a cadeira principal)
let myPlayerIdx = 0;          // Sua posicao na mesa (Host  sempre 0)
// Variável que armazena a máquina local de conexão ponto-a-ponto da biblioteca PeerJS
let myPeer = null;            // Objeto PeerJS
// Variável que armazena a "linha telefônica" aberta, caso este aparelho seja um cliente conectando ao criador da sala
let myConnToHost = null;      // conexao do Cliente com o Host
// Lista tipo "agenda" mantida pelo Host que grava quem e quantos estão conectados à sala dele
let connectedClients = [];    // Lista de conexoes que o Host mantem
// Sinalizador anti-lag. Diz se o cliente já animou a própria jogada na tela dele para não precisar esperar o servidor confirmar
let client_predicted = false; // Controle de latencia para jogadas locais

// Reconexao
// Contador que diz quantas vezes o código já tentou religar a internet após uma queda
let reconnectAttempts = 0;
// Limite máximo de tentativas que o sistema pode tentar restabelecer o multiplayer antes de assumir a desconexão definitiva
const MAX_RECONNECT_ATTEMPTS = 5;
// Tempo de atraso entre uma tentativa de religar a rede e outra
const RECONNECT_DELAY_MS = 3000; // 3s entre tentativas
// Variável que guarda o agendamento da próxima tentativa para que possamos cancelar caso a internet volte rápido
let reconnectTimer = null;
// Backup da letra/código da sala que o usuário estava jogando antes de a rede cair
let lastRoomCode = null;     // Guarda o codigo da sala para reconectar
// Backup do número da cadeira que o jogador ocupava antes de cair para pedir o mesmo lugar de volta
let lastPlayerIdx = null;    // Guarda o indice do jogador para restaurar
// Trava que indica se o sistema de segurança da rede está atualmente trabalhando para reconectar
let isReconnecting = false;

// Array global injetado na janela do navegador (Window) para acionar a luz de alerta cinza quando alguém passa a vez
window.visualPass = [false, false, false, false];

// Função utilitária criada para exterminar e limpar qualquer agendamento de turno/jogada que ainda esteja no relógio do sistema
function clearTurnTimer() {
    // Se existir algum cronômetro gravado na variável correspondente do estado
    if (STATE.turnTimer) {
        // Envia a ordem para o navegador cancelar a execução futura agendada
        clearTimeout(STATE.turnTimer);
        // Desocupa a variável devolvendo ela ao estado inicial nulo
        STATE.turnTimer = null;
    }
}

// Função utilitária rápida para resetar as estatísticas do módulo de segurança de rede
function resetReconnect() {
    // Zera a conta de falhas já que a crise (supostamente) acabou
    reconnectAttempts = 0;
    // Desliga a luz de alerta de reconexão informando ao código que as coisas voltaram ao normal
    isReconnecting = false;
}
