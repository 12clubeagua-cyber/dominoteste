/* 
   CONTROLE DE ENTRADA DO USUARIO (input.js)
 */

// Define uma função que será executada quando o usuário alterar o tamanho da janela (ou virar o celular)
const handleResize = () => {
  // Verifica se o estado do jogo e a lista de peças jogadas na mesa existem e se a mesa não está vazia
  if (STATE?.positions?.length > 0) {
    // Recalcula o zoom e o deslocamento da câmera para caberem todas as peças na nova tela
    updateSnakeScale();
    // Redesenha a mesa com as novas proporções calculadas
    renderBoardFromState();
  }
};
// Adiciona um "ouvinte" global que dispara a função acima toda vez que o evento 'resize' ocorre
window.addEventListener('resize', handleResize);

// Função auxiliar para remover a capacidade de clicar nas peças da mão do jogador
function removePlayableListeners() {
    // Acessa a mão do jogador local (myPlayerIdx) a partir do estado global
    const hand = STATE?.hands?.[myPlayerIdx];
    // Se a mão não for um array válido, interrompe a função para evitar erros
    if (!Array.isArray(hand)) return;

    // Percorre cada peça da mão do jogador. '_' indica que ignoramos o valor da peça e usamos apenas o índice (idx)
    hand.forEach((_, idx) => {
        // Busca o elemento HTML que representa essa peça na tela pelo ID
        const el = document.getElementById(`my-tile-${idx}`);
        // Se a peça for encontrada no HTML
        if (el) {
            // Remove a classe CSS 'playable' (que pode ter o efeito de brilhar ou subir quando o mouse passa)
            el.classList.remove('playable');
            // Anula qualquer evento de clique que essa peça tinha (impede jogadas fantasmas ou múltiplas)
            el.onclick = null;
        }
    });
}

// Função responsável por destacar as peças na mão que o usuário PODE jogar e adicionar o evento de clique a elas
function highlight(moves) {
  // Busca todos os elementos na página com a classe 'tile' e remove a classe 'playable' para garantir que nada fique brilhando erroneamente
  document.querySelectorAll('.tile').forEach(el => el.classList.remove('playable'));
  // Chama a função acima para limpar todos os ouvintes de clique velhos
  removePlayableListeners();

  // Percorre a lista de movimentos válidos (calculada no logic.js)
  moves.forEach(x => {
    // Busca no HTML a peça exata do jogador que corresponde ao índice do movimento válido
    const el = document.getElementById(`my-tile-${x.idx}`);
    // Se a peça sumiu do HTML por algum erro de renderização, ignora este movimento
    if (!el) return;
    
    // Adiciona a classe 'playable' nesta peça, ativando efeitos visuais no CSS (como borda brilhante)
    el.classList.add('playable');
    
    // Define o que acontece quando o usuário CLICA nesta peça permitida
    el.onclick = () => {
      // Se houver uma função de iniciar o áudio de forma segura, aciona ela (necessário em navegadores mobile)
      if (typeof safeAudioInit === 'function') safeAudioInit();
      // Se a tela ou o jogo estiverem bloqueados (ex: rodando animação), não faz nada ao clicar
      if (STATE.isBlocked) return;

      // Trava a tela imediatamente após o primeiro clique para impedir que o jogador clique várias vezes e quebre o turno
      STATE.isBlocked = true;

      // Remove a classe 'playable' de todas as peças instantaneamente para dar feedback visual de que o clique foi registrado
      document.querySelectorAll('.tile.playable').forEach(tile => tile.classList.remove('playable'));
      // Acessa o contêiner da mão do jogador local (Sempre 'hand-0' visualmente)
      const hand0 = document.getElementById('hand-0');
      // Remove a classe que indica que é a vez dele (apaga o fundo iluminado da mão)
      if (hand0) hand0.classList.remove('active-turn');

      // Limpa os cliques de todas as peças novamente para garantir
      removePlayableListeners();

      // Um truque de JavaScript: lê uma propriedade do DOM para forçar o navegador a repintar a tela imediatamente (Reflow)
      void document.body.offsetHeight; 

      // Pede ao navegador para processar a jogada no próximo ciclo de animação livre (deixa a interface fluida)
      requestAnimationFrame(() => {
          // Verifica se a ponta esquerda da mesa é diferente da ponta direita
          const extremesAreDifferent = STATE?.extremes?.[0] !== STATE?.extremes?.[1];
          // A peça precisa do menu se: a lógica disse que ela serve em 'both' (ambos os lados) E as pontas são diferentes E já tem peças na mesa
          const needsPicker = x.side === 'both' && extremesAreDifferent && STATE.positions?.length > 0;

          // Busca o menu de escolher o lado (Esquerda/Direita ou Cima/Baixo) e garante que esteja escondido
          const picker = document.getElementById('side-picker');
          if (picker) picker.style.display = 'none';

          // Se a pedra serve nos dois lados, o jogador precisa escolher
          if (needsPicker) {
            // Salva o índice da pedra clicada na memória temporária do estado para ser usada após a escolha
            STATE.pendingIdx = x.idx;
            // Mostra o menu de escolha (botões de Cima/Baixo)
            if (picker) {
                picker.style.display = 'flex';
            }
          } else {
            // Se não precisa escolher (só cabe em um lugar ou é a primeira peça ou os dois lados são iguais)
            // Normaliza 'both' ou 'any' para a ponta primária (0)
            const side = (x.side === 'both' || x.side === 'any') ? 0 : x.side;
            // Dispara a jogada diretamente sem perguntar
            play(myPlayerIdx, x.idx, side);
          }
      });
    };
  });
}

// Função disparada quando o jogador clica em "Cima" ou "Baixo" no menu de escolha
function executeMove(side) {
  // Esconde o menu de escolha de lado
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';

  // Se houver uma pedra gravada na memória de espera
  if (STATE.pendingIdx !== null) {
    // Pega o índice dessa pedra
    const idx = STATE.pendingIdx;
    // Limpa a memória para evitar duplicatas
    STATE.pendingIdx = null;
    // Executa a jogada oficialmente com a pedra guardada e o lado escolhido no botão
    play(myPlayerIdx, idx, side);
  }
}

// Função disparada quando o jogador clica em "Cancelar" no menu de escolha
function cancelMove() {
  // Esconde o menu de escolha de lado
  const picker = document.getElementById('side-picker');
  if (picker) picker.style.display = 'none';
  
  // Limpa o índice da pedra temporária da memória
  STATE.pendingIdx = null;
  // Destranca a tela, permitindo que o jogador escolha outra peça
  STATE.isBlocked = false;
  
  // Pega a mão do jogador novamente
  const hand = STATE?.hands?.[myPlayerIdx];
  if (Array.isArray(hand)) {
    // Recalcula as jogadas válidas
    const moves = getMoves(hand);
    // Se ainda houverem jogadas válidas (deveria), reativa o brilho e os cliques nelas
    if (moves.length > 0) highlight(moves);
  }
}
