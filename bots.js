/* 
   INTELIGENCIA DOS BOTS (bots.js)
 */
// getMoves esta definido em logic.js sem duplicata aqui

function chooseBotMove(botIdx, moves) {
    if (!Array.isArray(moves) || moves.length === 0 || !STATE) return moves?.[0] || null;
    
    if (typeof botIdx !== 'number' || botIdx < 0 || botIdx > 3) botIdx = 0;

    if (STATE.difficulty === 'hard') {
        let bestMove = moves[0]; 
        let bestScore = -Infinity;
        moves.forEach(move => {
            const hand = STATE?.hands?.[botIdx];
            const tile = hand?.[move.idx];
            if (!tile) return;
            const side = move.side === 'both' ? 0 : (move.side === 'any' ? 0 : move.side);
            let score = calculateWeight(botIdx, tile, side);
            const nextOpponent = (botIdx + 1) % 4;
            const simExtremes = [...STATE.extremes];
            simExtremes[side] = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
            const finalScore = score + simulateOpponentDanger(nextOpponent, simExtremes);
            if (finalScore > bestScore) { bestScore = finalScore; bestMove = move; }
        });
        return bestMove;
    }
    const scored = moves.map(m => {
        const side = m.side === 'both' ? 0 : (m.side === 'any' ? 0 : m.side);
        const tile = STATE?.hands?.[botIdx]?.[m.idx];
        return { ...m, weight: tile ? calculateWeight(botIdx, tile, side) : -1 };
    });
    scored.sort((a, b) => b.weight - a.weight);
    return scored[0];
}

function calculateWeight(botIdx, tile, side) {
    if (!tile || !Array.isArray(tile) || !STATE?.extremes || typeof side !== 'number') return 0;
    const extremes = STATE.extremes;
    if (side < 0 || side > 1 || !extremes[side]) return 0;

    const partner = (botIdx + 2) % 4, opp1 = (botIdx + 1) % 4, opp2 = (botIdx + 3) % 4;
    const nextExtreme = (tile[0] === extremes[side]) ? tile[1] : tile[0];
    let w = (tile[0] + tile[1]);
    if (tile[0] === tile[1]) w += 25;

    const memory = STATE?.playerMemory;
    if (Array.isArray(memory)) {
        if (Array.isArray(memory[opp1]) && memory[opp1].includes(nextExtreme)) w += 50;
        if (Array.isArray(memory[opp2]) && memory[opp2].includes(nextExtreme)) w += 50;
        if (Array.isArray(memory[partner]) && memory[partner].includes(nextExtreme)) w -= 40;
    }

    const handSize = STATE?.handSize;
    if (STATE?.difficulty === 'normal' || STATE?.difficulty === 'hard') {
        if ((Array.isArray(handSize) && handSize[opp1] <= 2) || (Array.isArray(handSize) && handSize[opp2] <= 2)) w += 30;
    }
    return w;
}

function simulateOpponentDanger(oppIdx, simExtremes) {
    if (!Array.isArray(simExtremes) || simExtremes.length < 2) return 0;
    const memory = STATE?.playerMemory?.[oppIdx];
    if (!Array.isArray(memory)) return 0;
    
    const cl = memory.includes(simExtremes[0]);
    const cr = memory.includes(simExtremes[1]);
    if (cl && cr) return 60; // Bloquear oponente e positivo
    
    let danger = 0;
    if (!cl) danger += 20;
    if (!cr) danger += 20;
    if (Array.isArray(STATE?.handSize) && STATE.handSize[oppIdx] <= 2) danger *= 2;
    return danger;
}

