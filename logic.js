/* 
   LOGICA MATEMATICA DO JOGO (logic.js)
 */

// Função responsável por identificar quais peças da mão do jogador podem ser jogadas
function getMoves(hand) {
  // Verifica se a mão fornecida é um array válido. Se não for, retorna um array vazio (nenhuma jogada)
  if (!Array.isArray(hand)) return [];
  // Se ainda não houver nenhuma peça jogada na mesa (início da rodada)
  if (!STATE?.positions?.length) {
    // Verifica se esta é a primeira rodada do jogo inteiro (nenhum vencedor anterior)
    if (STATE?.roundWinner === null) {
      // Procura na mão do jogador se ele possui a peça "bucha de 6" (duplo 6)
      const idx = hand.findIndex(t => t[0] === 6 && t[1] === 6);
      // Se tiver o duplo 6, ele é a ÚNICA jogada permitida. Se não tiver, qualquer peça pode ser jogada.
      // O 'side: "any"' indica que, como a mesa está vazia, a peça pode ser colocada de qualquer forma.
      return idx !== -1 ? [{ idx, side: 'any' }] : hand.map((_, i) => ({ idx: i, side: 'any' }));
    }
    // Se não for a primeira rodada do jogo (alguém bateu antes), quem começa pode jogar qualquer peça
    return hand.map((_, i) => ({ idx: i, side: 'any' }));
  }
  
  // Se já existirem peças na mesa, acessa os valores que estão nas pontas (extremes)
  const extremes = STATE?.extremes;
  // Se por algum motivo as pontas não existirem ou estiverem incompletas, não permite jogar
  if (!extremes || extremes.length < 2) return [];

  // Avalia cada peça da mão para ver se ela se encaixa em alguma ponta
  return hand.map((t, i) => {
    // Verifica se algum dos números da peça (t[0] ou t[1]) é igual à ponta esquerda/cima (extremes[0])
    const L = t[0] === extremes[0] || t[1] === extremes[0];
    // Verifica se algum dos números da peça é igual à ponta direita/baixo (extremes[1])
    const R = t[0] === extremes[1] || t[1] === extremes[1];
    
    // Se a peça encaixa nas DUAS pontas, retorna o movimento com o aviso de que serve em 'both' (ambos)
    if (L && R) return { idx: i, side: 'both' };
    // Se encaixa apenas na ponta esquerda, retorna 'side: 0'
    if (L) return { idx: i, side: 0 };
    // Se encaixa apenas na ponta direita, retorna 'side: 1'
    if (R) return { idx: i, side: 1 };
    
    // Se não encaixa em lugar nenhum, retorna null
    return null;
  // O '.filter(Boolean)' remove todos os 'null' do array, sobrando apenas as jogadas válidas
  }).filter(Boolean);
}

// Função responsável por calcular as coordenadas X e Y exatas onde uma peça deve ser desenhada na mesa
function calculateTilePlacement(tile, side) {
  // Valida se a peça recebida é um array com pelo menos dois números (ex: [3, 4])
  if (!Array.isArray(tile) || tile.length < 2) {
    // Se estiver quebrado, avisa no log
    console.warn('calculateTilePlacement: tile invalido', tile);
    // E retorna null, interrompendo o cálculo
    return null;
  }
  
  // Valida se o lado escolhido para jogar (0 ou 1) é um número válido
  if (typeof side !== 'number' || side < 0 || side > 1) {
    // Avisa se der erro
    console.warn('calculateTilePlacement: side invalido', side);
    // Assume o lado 0 por segurança para não travar o jogo
    side = 0;  // Default seguro
  }

  // Verifica se a peça é uma "bucha/carroça" (os dois números são iguais, ex: [5,5])
  const isD = tile[0] === tile[1];

  // Se o controle de extremidades (ends) da mesa não existir (primeira jogada do jogo inteiro)
  if (!STATE.ends || STATE.ends.length < 2) {
    // Inicializa a configuração das duas pontas que vão crescer
    // dir = direção em graus (0, 90, 180, 270)
    // hsc = coordenadas da ponta. wasDouble = se a ponta atual é uma bucha
    STATE.ends = [
      { hscX: 0, hscY: 0, dir: 0, lineCount: 0, wasDouble: false, lastVDir: 90 },
      { hscX: 0, hscY: 0, dir: 180, lineCount: 0, wasDouble: false, lastVDir: 270 }
    ];
  }

  // Se a mesa estiver vazia (esta é a primeira peça sendo jogada)
  if (!STATE.positions.length) {
    // Define as coordenadas como o centro absoluto da tela (0,0)
    // 'isV: !isD' significa que peças normais ficam horizontais, mas buchas ficam verticais (cruzadas)
    const nP = { x: 0, y: 0, v1: tile[0], v2: tile[1], isV: !isD };
    
    // Atualiza o controle da ponta 0 para registrar que começa no centro
    STATE.ends[0].hscX = 0; STATE.ends[0].hscY = 0; STATE.ends[0].wasDouble = isD;
    // Atualiza o controle da ponta 1
    STATE.ends[1].hscX = 0; STATE.ends[1].hscY = 0; STATE.ends[1].wasDouble = isD;
    
    // Retorna a posição calculada e avisa qual será a nova ponta disponível (neste caso, o segundo número)
    return { nP, vOther: tile[1] };
  }

  // Pega o número que está na ponta onde a peça vai ser jogada
  const c = STATE.extremes[side];
  // Identifica qual metade da peça tem o número que "gruda" na mesa
  const vMatch = tile[0] === c ? tile[0] : tile[1];
  // Identifica qual metade da peça ficará virada para fora, sendo a "nova" ponta
  const vOther = tile[0] === c ? tile[1] : tile[0];

  // Acessa o objeto que controla a geometria e direção daquela ponta específica
  const e = STATE.ends[side];
  // As 4 linhas abaixo são proteções de segurança: garantem que as propriedades matemáticas não estejam vazias
  if (typeof e.dir !== 'number') e.dir = side === 0 ? 0 : 180;
  if (typeof e.lineCount !== 'number') e.lineCount = 0;
  if (typeof e.wasDouble !== 'boolean') e.wasDouble = false;
  if (typeof e.lastVDir !== 'number') e.lastVDir = side === 0 ? 90 : 270;

  // Verifica se a ponta atualmente está crescendo na vertical (90 graus p/ baixo ou 270 graus p/ cima)
  let isVertFlow = (e.dir === 90 || e.dir === 270);
  
  // Define o limite de peças antes de forçar uma curva. Pega do config. Se for vertical o limite é um, se for horizontal é outro.
  const maxInLine = isVertFlow ? (CONFIG?.GAME?.MAX_VERT ?? 6) : (CONFIG?.GAME?.MAX_HORIZ ?? 6);

  // Calcula a diferença de movimento X baseada na direção que a ponta estava seguindo antes desta peça
  const oldDX = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  // Calcula a diferença de movimento Y baseada na direção antiga
  const oldDY = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  // VERIFICAÇÃO DE CURVA: Se atingiu o limite da linha, e a peça não é dupla, e a ponta não é dupla
  if (e.lineCount >= maxInLine && !isD && !e.wasDouble) {
    // Se estava fluindo na vertical
    if (isVertFlow) {
      // Salva qual foi a última direção vertical usada (para não cruzar o próprio rabo no futuro)
      e.lastVDir = e.dir;
      // Vira a direção para a horizontal (0 = direita, 180 = esquerda)
      e.dir = (side === 1 ? 0 : 180);
    } else {
      // Se estava na horizontal, vira para a vertical na direção oposta ao que subiu/desceu da última vez
      e.dir = (e.lastVDir === 90 ? 270 : 90);
    }
    // Zera o contador de peças na linha, já que começou uma linha nova
    e.lineCount = 0;
    // Atualiza a variável pra saber se o fluxo novo é vertical ou não
    isVertFlow = (e.dir === 90 || e.dir === 270);
  }
  // Soma +1 no contador de peças desta reta
  e.lineCount++;

  // Calcula a nova diferença de movimento X baseada na direção atualizada
  const dx = e.dir === 0 ? 1 : e.dir === 180 ? -1 : 0;
  // Calcula a nova diferença de movimento Y baseada na direção atualizada
  const dy = e.dir === 90 ? 1 : e.dir === 270 ? -1 : 0;

  // Pega a largura padrão de uma peça nas configurações
  const TW = CONFIG?.GAME?.TILE_W ?? 18;
  // Pega o comprimento padrão de uma peça nas configurações
  const TL = CONFIG?.GAME?.TILE_L ?? 36;

  // MATEMÁTICA DE POSICIONAMENTO
  // 'stepOut' calcula a distância para "sair" do centro da última peça jogada. Buchas têm tamanhos diferentes.
  const stepOut  = (e.wasDouble ? TW / 2 : TL / 2) + (TW / 2);
  // 'stepSide' calcula a distância extra para posicionar o centro desta nova peça
  const stepSide = (isD ? TW / 2 : TL / 2) - (TW / 2);

  // Calcula a coordenada X final somando a posição antiga + movimento base + movimento adicional da direção
  const nx = e.hscX + (stepOut * oldDX) + (stepSide * dx);
  // Calcula a coordenada Y final
  const ny = e.hscY + (stepOut * oldDY) + (stepSide * dy);

  // Monta o objeto com todas as informações físicas e visuais desta nova peça
  const nP = {
    x: nx, y: ny, // Coordenadas calculadas
    // Se a peça estiver virada pra esquerda (180) ou pra cima (270), os números precisam ser desenhados invertidos
    v1: (e.dir === 180 || e.dir === 270) ? vOther : vMatch,
    v2: (e.dir === 180 || e.dir === 270) ? vMatch : vOther,
    // Define se a peça será desenhada de pé ou deitada (depende se o fluxo é vertical e se a peça é bucha)
    isV: isVertFlow ? !isD : isD
  };

  // Atualiza as coordenadas da ponta no sistema para a próxima peça saber de onde começar
  e.hscX = nx;
  e.hscY = ny;
  // Grava se esta peça que acabou de ser posta foi uma bucha (importante para os cálculos de distância futuros)
  e.wasDouble = isD;

  // Retorna as coordenadas calculadas e qual é o número que ficou exposto na nova ponta
  return { nP, vOther };
}
