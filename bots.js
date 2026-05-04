/* 
   INTELIGENCIA DOS BOTS (bots.js)
 */

// getMoves esta definido em logic.js sem duplicata aqui (aviso para não declarar a mesma função duas vezes)

// Função principal que decide qual jogada o bot vai fazer, dada uma lista de movimentos possíveis
function chooseBotMove(botIdx, moves) {
    // Validação de segurança: se não houver jogadas ou o estado do jogo não existir, retorna a primeira jogada ou null
    if (!Array.isArray(moves) || moves.length === 0 || !STATE) return moves?.[0] || null;
    
    // Validação do índice do bot: garante que ele seja um número válido de 0 a 3, caso contrário assume 0
    if (typeof botIdx !== 'number' || botIdx < 0 || botIdx > 3) botIdx = 0;

    // Lógica para a dificuldade 'DIFÍCIL' (hard), que olha um turno no futuro
    if (STATE.difficulty === 'hard') {
        let bestMove = moves[0]; // Inicializa a melhor jogada sendo a primeira da lista
        let bestScore = -Infinity; // Inicia a melhor pontuação com o menor valor possível
        
        // Itera sobre cada jogada possível para simulá-la e pontuá-la
        moves.forEach(move => {
            const hand = STATE?.hands?.[botIdx]; // Acessa a mão de peças atual do bot
            const tile = hand?.[move.idx]; // Pega a peça exata que o bot pretende jogar nesta simulação
            if (!tile) return; // Se a peça não for encontrada por algum motivo de desincronização, ignora a iteração
            
            // Normaliza o lado da mesa em que a peça será jogada para 0 ou 1
            const side = move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side);
            
            // Calcula o peso imediato (pontos da peça, carroças, etc) de jogar esta pedra
            let score = calculateWeight(botIdx, tile, side);
            
            // Calcula qual é o índice do próximo jogador (o adversário à esquerda do bot)
            const nextOpponent = (botIdx + 1) % 4;
            
            // Faz uma cópia das pontas atuais da mesa para simular como ficariam após a jogada
            const simExtremes = [...STATE.extremes];
            
            // Atualiza a ponta simulada do lado em que a peça foi jogada com o novo número que ficará exposto
            simExtremes[side] = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
            
            // Soma o peso imediato com o bônus/penalidade baseado em como isso afeta o próximo adversário
            const finalScore = score + simulateOpponentDanger(nextOpponent, simExtremes);
            
            // Se esta jogada tiver uma pontuação maior que a melhor encontrada até agora, ela vira a nova favorita
            if (finalScore > bestScore) { bestScore = finalScore; bestMove = move; }
        });
        // Após avaliar todas, retorna a que teve a melhor pontuação combinada
        return bestMove;
    }

    // Lógica para dificuldades inferiores (não olha o futuro, apenas o peso imediato)
    const scored = moves.map(m => {
        // Normaliza o lado da mesa
        const side = m.side === 'both' ? 0 : (m.side === 'any' ? 0 : m.side);
        // Pega a peça da mão do bot
        const tile = STATE?.hands?.[botIdx]?.[m.idx];
        // Retorna o objeto da jogada anexando a propriedade 'weight' (peso calculado pela função)
        return { ...m, weight: tile ? calculateWeight(botIdx, tile, side) : -1 };
    });
    
    // Ordena as jogadas em ordem decrescente de peso (da mais vantajosa para a menos)
    scored.sort((a, b) => b.weight - a.weight);
    
    // Retorna a jogada que ficou em primeiro lugar na ordenação
    return scored[0];
}

// Função que calcula a "vantagem" imediata de descartar uma determinada peça
function calculateWeight(botIdx, tile, side) {
    // Validações pesadas de integridade dos dados, se algo estiver faltando, o peso é zero
    if (!tile || !Array.isArray(tile) || !STATE?.extremes || typeof side !== 'number') return 0;
    
    // Pega as pontas atuais da mesa
    const extremes = STATE.extremes;
    // Se o lado for inválido ou não existir uma ponta ali, o peso é zero
    if (side < 0 || side > 1 || !extremes[side]) return 0;

    // Mapeamento das posições na mesa: parceiro (frente), oponente 1 (esquerda), oponente 2 (direita)
    const partner = (botIdx + 2) % 4, opp1 = (botIdx + 1) % 4, opp2 = (botIdx + 3) % 4;
    
    // Descobre qual o número da peça que ficará exposto (ponta nova) se ela for jogada
    const nextExtreme = (tile[0] === extremes[side]) ? tile[1] : tile[0];
    
    // O peso inicial é a soma dos pontos da peça (é sempre bom se livrar de peças pesadas)
    let w = (tile[0] + tile[1]);
    
    // Se a peça for uma carroça (dobrado/bucha), ganha um bônus de prioridade de 25 pontos pra se livrar logo
    if (tile[0] === tile[1]) w += 25;

    // Acessa a memória de números em que os jogadores "passaram a vez" (bateram na mesa)
    const memory = STATE?.playerMemory;
    if (Array.isArray(memory)) {
        // Se a jogada deixa um número na ponta que oponente 1 não tem, ganha 50 pontos de prioridade tática
        if (Array.isArray(memory[opp1]) && memory[opp1].includes(nextExtreme)) w += 50;
        // Se a jogada deixa um número na ponta que oponente 2 não tem, também ganha 50 pontos
        if (Array.isArray(memory[opp2]) && memory[opp2].includes(nextExtreme)) w += 50;
        // Se a jogada deixa um número na ponta que o PARCEIRO não tem, recebe penalidade de 40 pontos pra evitar foder o amigo
        if (Array.isArray(memory[partner]) && memory[partner].includes(nextExtreme)) w -= 40;
    }

    // Acessa o tamanho das mãos (quantas peças restam para cada um)
    const handSize = STATE?.handSize;
    // Táticas exclusivas de modos normal/difícil
    if (STATE?.difficulty === 'normal' || STATE?.difficulty === 'hard') {
        // Se algum adversário tem 2 ou menos peças (prestes a bater), o peso da jogada sobe pra incentivar defesas desesperadas
        if ((Array.isArray(handSize) && handSize[opp1] <= 2) || (Array.isArray(handSize) && handSize[opp2] <= 2)) w += 30;
    }
    
    // Retorna a pontuação (peso) final desta peça
    return w;
}

// Função que avalia quão hostil o tabuleiro ficará para o próximo adversário jogar
function simulateOpponentDanger(oppIdx, simExtremes) {
    // Valida o array de pontas simuladas
    if (!Array.isArray(simExtremes) || simExtremes.length < 2) return 0;
    
    // Acessa a memória do que o adversário não tem (passou a vez)
    const memory = STATE?.playerMemory?.[oppIdx];
    // Se não há memória registrada ainda, não há perigo calculável
    if (!Array.isArray(memory)) return 0;
    
    // Checa se o adversário já passou a vez para o número simulado da ponta esquerda
    const cl = memory.includes(simExtremes[0]);
    // Checa se o adversário já passou a vez para o número simulado da ponta direita
    const cr = memory.includes(simExtremes[1]);
    
    // Se o adversário não tem NENHUMA das duas pontas simuladas, é a jogada de ouro, bloqueia ele e soma 60 pontos no peso
    if (cl && cr) return 60; // Bloquear oponente e positivo
    
    let danger = 0; // Valor que será retornado para ser somado na atratividade da jogada
    
    // A lógica original diz: se o oponente NÃO passou na ponta esquerda, ele PODE ter a peça. Adiciona 20 pontos à jogada.
    if (!cl) danger += 20;
    // Se ele NÃO passou na ponta direita, ele PODE ter a peça. Adiciona 20 pontos à jogada.
    // *Nota analítica: Isso cria um comportamento curioso. A IA ganha 60 por bloquear tudo, mas ganha 20/40 se não bloquear.
    if (!cr) danger += 20;
    
    // Se o oponente tem 2 ou menos peças na mão, dobra o valor de 'danger', aumentando a prioridade geral destas avaliações
    if (Array.isArray(STATE?.handSize) && STATE.handSize[oppIdx] <= 2) danger *= 2;
    
    // Retorna a pontuação calculada
    return danger;
}
