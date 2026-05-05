/* 
   ========================================================================
   REFEREE.JS - O JUIZ (VERSÃO BLINDADA)
   Responsável pelas regras de pontuação, vitória e início de rodada.
   ======================================================================== 
*/

window.Referee = {
    /**
     * Define quem deve começar a rodada.
     * Regra: Se houver um vencedor anterior, ele começa. 
     * Se for a primeira rodada, quem tiver a "Bucha de 6" (6-6) começa.
     */
    getInitialPlayer: function(hands, lastWinner) {
        // 1. Se já existe um vencedor da rodada anterior, ele tem a preferência
        if (lastWinner !== null && lastWinner !== undefined && lastWinner >= 0 && lastWinner <= 3) {
            return lastWinner;
        }

        // 2. Busca pela Bucha de Seis (6-6) para o início da partida
        let starter = 0; // Fallback de segurança para o Jogador Local
        
        if (Array.isArray(hands)) {
            hands.forEach((hand, playerIdx) => {
                // Previne erros caso a mão do jogador não tenha sido carregada corretamente
                if (Array.isArray(hand)) {
                    const hasBucha6 = hand.some(tile => tile[0] === 6 && tile[1] === 6);
                    if (hasBucha6) {
                        starter = playerIdx;
                    }
                }
            });
        }

        return starter;
    },

    /**
     * Calcula o resultado quando o jogo "tranca" (ninguém mais tem jogada).
     * Regra: Somam-se os pontos das peças nas mãos das duplas. 
     * A dupla com a MENOR contagem vence.
     */
    calculateBlockResult: function(hands) {
        // Fallback de segurança: se as mãos sumirem, decreta empate técnico
        if (!Array.isArray(hands) || hands.length < 4) {
            return { winTeam: -1, detail: "Erro na contagem das peças.", isDraw: true, points: 0 };
        }

        // Soma das peças da Equipe A (Jogadores 0 e 2)
        const sumA = this._sumHandPoints(hands[0]) + this._sumHandPoints(hands[2]);
        
        // Soma das peças da Equipe B (Jogadores 1 e 3)
        const sumB = this._sumHandPoints(hands[1]) + this._sumHandPoints(hands[3]);

        let winTeam = -1; // -1 indica empate técnico (raro, mas possível no dominó)
        let detail = `Sua Dupla: ${sumA} pts | Oponentes: ${sumB} pts`; // Texto ajustado para a UI

        if (sumA < sumB) {
            winTeam = 0; // Vitória da Dupla A
        } else if (sumB < sumA) {
            winTeam = 1; // Vitória da Dupla B
        }

        return {
            winTeam: winTeam,
            detail: detail,
            isDraw: (winTeam === -1),
            points: (winTeam !== -1) ? 1 : 0 // A rodada vale 1 ponto
        };
    },

    /**
     * Valida se um jogador realmente "bateu" (esvaziou a mão).
     */
    checkWin: function(hand) {
        return Array.isArray(hand) && hand.length === 0;
    },

    /**
     * Função auxiliar (privada) para somar os pontos de uma mão específica.
     */
    _sumHandPoints: function(hand) {
        if (!Array.isArray(hand)) return 0;
        // Valida se a peça tem valores numéricos antes de somar, prevenindo "NaN" (Not a Number)
        return hand.reduce((total, tile) => total + (tile[0] || 0) + (tile[1] || 0), 0);
    }
};