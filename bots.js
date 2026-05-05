/* 
   ========================================================================
   BOTS.JS - INTELIGÊNCIA ARTIFICIAL (VERSÃO BLINDADA E PRO)
   ======================================================================== 
*/

/**
 * Escolhe a melhor jogada disponível com base na dificuldade definida no STATE.
 * Exportada para window para que processTurn() (game.js) a encontre com segurança.
 */
window.chooseBotMove = function(botIdx, moves) {
    if (!Array.isArray(moves) || moves.length === 0) return null;
    const safeBotIdx = (typeof botIdx === 'number') ? botIdx : 0;
    
    // Fallback de segurança para o estado global
    const currentState = window.STATE || {};
    const difficulty = currentState.difficulty || 'normal';

    // --- MODO DIFÍCIL (Simulação e Obstrução) ---
    if (difficulty === 'hard') {
        let bestMove = null;
        let highestScore = -Infinity;
        
        moves.forEach(move => {
            const hand = currentState.hands?.[safeBotIdx];
            if (!hand || !hand[move.idx]) return;
            const tile = hand[move.idx];
            
            const sidesToTry = (move.side === 'both') ? [0, 1] : [(move.side === 'any' ? 0 : move.side)];
            
            sidesToTry.forEach(s => {
                let score = window.calculateWeight(safeBotIdx, tile, s);
                
                // Simulação de Obstrução: avalia o próximo oponente
                const nextOpponent = (safeBotIdx + 1) % 4;
                const simExtremes = [...(currentState.extremes || [null, null])];
                simExtremes[s] = (tile[0] === currentState.extremes?.[s]) ? tile[1] : tile[0];
                
                score += window.evaluateOpponentObstruction(nextOpponent, simExtremes);
                
                if (score > highestScore) {
                    highestScore = score;
                    bestMove = { ...move, side: s };
                }
            });
        });
        return bestMove || moves[0];
    }

    // --- MODO FÁCIL / NORMAL (Baseado em Pesos) ---
    const scoredMoves = [];
    moves.forEach(m => {
        const sidesToEval = (m.side === 'both') ? [0, 1] : [(m.side === 'any' ? 0 : m.side)];
        
        sidesToEval.forEach(s => {
            const tile = currentState.hands?.[safeBotIdx]?.[m.idx];
            if (tile) {
                scoredMoves.push({
                    ...m,
                    side: s,
                    weight: window.calculateWeight(safeBotIdx, tile, s)
                });
            }
        });
    });

    // Modo Fácil: Adiciona ruído (erro proposital) nas decisões
    if (difficulty === 'easy') {
        scoredMoves.forEach(m => m.weight += (Math.random() * 40 - 20));
    }

    // Ordena do maior peso para o menor
    scoredMoves.sort((a, b) => b.weight - a.weight);
    return scoredMoves[0] || moves[0];
};

/**
 * Calcula o peso estratégico de uma peça específica.
 */
window.calculateWeight = function(botIdx, tile, side) {
    const currentState = window.STATE || {};
    const hand = currentState.hands?.[botIdx] || [];
    
    // CASO INICIAL: Se for a primeira jogada, foca em pontos e buchas
    if (!currentState.extremes || currentState.extremes[0] === null) {
        return (tile[0] + tile[1]) + (tile[0] === tile[1] ? 60 : 0);
    }

    const extremes = currentState.extremes;
    const partner = (botIdx + 2) % 4;
    const opponents = [(botIdx + 1) % 4, (botIdx + 3) % 4];
    const nextExtreme = (tile[0] === extremes[side]) ? tile[1] : tile[0];

    // --- 1. PESO DE DESCARTE (Hand Cleaning) ---
    // Prioriza soltar peças com soma alta para evitar derrota pesada no trancamento
    let weight = (tile[0] + tile[1]) * 1.2; 

    // --- 2. BÔNUS DE BUCHA (Doubles) ---
    // Livrar-se de buchas é prioridade tática para evitar trancamento da própria mão
    if (tile[0] === tile[1]) weight += 40;

    // --- 3. INTELIGÊNCIA DE NAIPE (Suit Counting) ---
    // O bot prefere deixar na ponta um número que ele tenha em abundância na mão
    const countInHand = hand.filter(t => t[0] === nextExtreme || t[1] === nextExtreme).length;
    weight += (countInHand * 15); 

    // --- 4. LÓGICA DE MEMÓRIA (Partner & Opponents) ---
    const memory = currentState.playerMemory;
    if (Array.isArray(memory)) {
        // Bloqueio: Se o próximo extremo for algo que os oponentes já passaram (não têm)
        opponents.forEach(opp => {
            if (Array.isArray(memory[opp]) && memory[opp].includes(nextExtreme)) {
                weight += 50; 
            }
        });

        // Apoio: Se o próximo extremo for algo que o parceiro já passou, evite jogar!
        if (Array.isArray(memory[partner]) && memory[partner].includes(nextExtreme)) {
            weight -= 60; 
        }
    }

    // --- 5. BÔNUS DE FINAL DE JOGO ---
    if (hand.length <= 2) weight += 30;

    return weight;
};

/**
 * Heurística de obstrução para simular o impacto da jogada no adversário.
 */
window.evaluateOpponentObstruction = function(oppIdx, simExtremes) {
    const memory = window.STATE?.playerMemory?.[oppIdx];
    if (!Array.isArray(memory)) return 0;
    
    const blocksLeft = memory.includes(simExtremes[0]);
    const blocksRight = memory.includes(simExtremes[1]);
    
    // Se a jogada tranca ambos os lados para o oponente, é uma jogada excelente
    if (blocksLeft && blocksRight) return 70;
    // Se tranca apenas um lado, é boa
    if (blocksLeft || blocksRight) return 30;
    
    return 0;
};