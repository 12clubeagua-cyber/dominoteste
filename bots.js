/* 
   ========================================================================
   BOTS.JS - INTELIGENCIA ARTIFICIAL (VERSAO BLINDADA E PRO)
   ======================================================================== 
*/

/**
 * Escolhe a melhor jogada disponivel com base na dificuldade definida no STATE.
 * Exportada para window para que processTurn() (game.js) a encontre com seguranca.
 */
window.chooseBotMove = function(botIdx, moves) {
    if (!Array.isArray(moves) || moves.length === 0) return null;
    const safeBotIdx = (typeof botIdx === 'number') ? botIdx : 0;
    
    // Fallback de seguranca para o estado global
    const currentState = window.STATE || {};
    const difficulty = currentState.difficulty || 'normal';

    // --- MODO DIFICIL (Simulacao e Obstrucao) ---
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
                
                // Simulacao de Obstrucao: avalia o proximo oponente
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

    // --- MODO FACIL / NORMAL (Baseado em Pesos) ---
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

    // Modo Facil: Adiciona ruido (erro proposital) nas decisoes
    if (difficulty === 'easy') {
        scoredMoves.forEach(m => m.weight += (Math.random() * 40 - 20));
    }

    // Ordena do maior peso para o menor
    scoredMoves.sort((a, b) => b.weight - a.weight);
    return scoredMoves[0] || moves[0];
};

/**
 * Calcula o peso estrategico de uma peca especifica.
 */
window.calculateWeight = function(botIdx, tile, side) {
    const currentState = window.STATE || {};
    const hand = currentState.hands?.[botIdx] || [];
    const personality = currentState.botPersonalities?.[botIdx] || 'normal';
    
    // CASO INICIAL: Se for a primeira jogada, foca em pontos e buchas
    if (!currentState.extremes || currentState.extremes[0] === null) {
        return (tile[0] + tile[1]) + (tile[0] === tile[1] ? 60 : 0);
    }

    const extremes = currentState.extremes;
    const partner = (botIdx + 2) % 4;
    const opponents = [(botIdx + 1) % 4, (botIdx + 3) % 4];
    const nextExtreme = (tile[0] === extremes[side]) ? tile[1] : tile[0];

    let weight = 0;

    // --- 1. LOGICA POR PERSONALIDADE ---
    if (personality === 'aggressive') {
        // Prioriza descartar o maior valor (limpar a mao rapidamente)
        weight += (tile[0] + tile[1]) * 2.0;
        if (tile[0] === tile[1]) weight += 60;
    } else if (personality === 'defensive') {
        // Prioriza bloquear oponentes e ajudar o parceiro
        weight += (tile[0] + tile[1]) * 0.8;
        if (tile[0] === tile[1]) weight += 20;
    } else if (personality === 'random') {
        weight += Math.random() * 100;
    } else {
        // Normal
        weight += (tile[0] + tile[1]) * 1.2; 
        if (tile[0] === tile[1]) weight += 40;
    }

    // --- 2. INTELIGENCIA DE NAIPE ---
    const countInHand = hand.filter(t => t[0] === nextExtreme || t[1] === nextExtreme).length;
    weight += (countInHand * 15); 

    // --- 3. LOGICA DE MEMORIA ---
    const memory = currentState.playerMemory;
    if (Array.isArray(memory)) {
        opponents.forEach(opp => {
            if (Array.isArray(memory[opp]) && memory[opp].includes(nextExtreme)) {
                weight += 50; // Bloqueio
            }
        });

        if (Array.isArray(memory[partner]) && memory[partner].includes(nextExtreme)) {
            weight -= 60; // Apoio
        }
    }

    return weight;
};

/**
 * Heuristica de obstrucao para simular o impacto da jogada no adversario.
 */
window.evaluateOpponentObstruction = function(oppIdx, simExtremes) {
    const memory = window.STATE?.playerMemory?.[oppIdx];
    if (!Array.isArray(memory)) return 0;
    
    const blocksLeft = memory.includes(simExtremes[0]);
    const blocksRight = memory.includes(simExtremes[1]);
    
    // Se a jogada tranca ambos os lados para o oponente, e uma jogada excelente
    if (blocksLeft && blocksRight) return 70;
    // Se tranca apenas um lado, e boa
    if (blocksLeft || blocksRight) return 30;
    
    return 0;
};