/* ═══════════════════════════════════════════════════════
   INTELIGÊNCIA DOS BOTS (bots.js)
═══════════════════════════════════════════════════════ */
function getMoves(hand) {
  if (!STATE.positions.length) {
    if (STATE.roundWinner === null) {
      const idx = hand.findIndex(t => t[0]===6 && t[1]===6);
      if (idx !== -1) return [{ idx, side:'any' }];
    }
    return hand.map((_, i) => ({ idx:i, side:'any' }));
  }
  return hand.map((t, i) => {
    const L = t[0]===STATE.extremes[0] || t[1]===STATE.extremes[0];
    const R = t[0]===STATE.extremes[1] || t[1]===STATE.extremes[1];
    return L && R ? { idx:i, side:'both' } : L ? { idx:i, side:0 } : R ? { idx:i, side:1 } : null;
  }).filter(Boolean);
}

function chooseBotMove(botIdx, moves) {
    if (STATE.difficulty === 'hard') {
        let bestMove = null; let bestScore = -Infinity;
        moves.forEach(move => {
            const tile = STATE.hands[botIdx][move.idx];
            const side = move.side === 'both' ? 0 : (move.side === 'any' ? 1 : move.side);
            let score = calculateWeight(botIdx, tile, side);
            const nextOpponent = (botIdx + 1) % 4;
            const simExtremes = [...STATE.extremes];
            simExtremes[side] = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
            const finalScore = score - simulateOpponentDanger(nextOpponent, simExtremes);
            if (finalScore > bestScore) { bestScore = finalScore; bestMove = move; }
        });
        return bestMove;
    }
    const scored = moves.map(m => {
        const side = m.side === 'both' ? 0 : (m.side === 'any' ? 1 : m.side);
        return { ...m, weight: calculateWeight(botIdx, STATE.hands[botIdx][m.idx], side) };
    });
    scored.sort((a, b) => b.weight - a.weight);
    return scored[0];
}

function calculateWeight(botIdx, tile, side) {
    const partner = (botIdx + 2) % 4, opp1 = (botIdx + 1) % 4, opp2 = (botIdx + 3) % 4;
    const nextExtreme = (tile[0] === STATE.extremes[side]) ? tile[1] : tile[0];
    let w = (tile[0] + tile[1]);
    if (tile[0] === tile[1]) w += 25;
    if (STATE.playerMemory[opp1].includes(nextExtreme)) w += 50;
    if (STATE.playerMemory[opp2].includes(nextExtreme)) w += 50;
    if (STATE.playerMemory[partner].includes(nextExtreme)) w -= 40;
    if (STATE.difficulty === 'normal' || STATE.difficulty === 'hard') {
        if (STATE.handSize[opp1] <= 2 || STATE.handSize[opp2] <= 2) w += 30;
    }
    return w;
}

function simulateOpponentDanger(oppIdx, simExtremes) {
    let danger = 0;
    const cl = STATE.playerMemory[oppIdx].includes(simExtremes[0]);
    const cr = STATE.playerMemory[oppIdx].includes(simExtremes[1]);
    if (cl && cr) return -60;
    if (!cl) danger += 20;
    if (!cr) danger += 20;
    if (STATE.handSize[oppIdx] <= 2) danger *= 2;
    return danger;
}