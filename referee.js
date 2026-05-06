/* 
   ========================================================================
   REFEREE.JS - O JUIZ (VERSAO BLINDADA)
   Responsavel pelas regras de pontuacao, vitoria e inicio de rodada.
   ======================================================================== 
*/

window.Referee = {
    /**
     * Define quem deve começar a rodada.
     * Regra: Se houver um vencedor anterior, ele comeca. 
     * Se for a primeira rodada, quem tiver a "Bucha de 6" (6-6) comeca.
     */
    getInitialPlayer: function(hands, lastWinner) {
        // 1. Se ja existe um vencedor da rodada anterior, ele tem a preferencia
        if (lastWinner !== null && lastWinner !== undefined && lastWinner >= 0 && lastWinner <= 3) {
            return lastWinner;
        }

        // 2. Busca pela Bucha de Seis (6-6) para o inicio da partida
        let starter = 0; // Fallback de seguranca para o Jogador Local
        
        if (Array.isArray(hands)) {
            hands.forEach((hand, playerIdx) => {
                // Previne erros caso a mao do jogador nao tenha sido carregada corretamente
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
     * Calcula o resultado quando o jogo "tranca" (ninguem mais tem jogada).
     * Regra: Somam-se os pontos das pecas nas maos das duplas. 
     * A dupla com a MENOR contagem vence.
     */
    calculateBlockResult: function(hands) {
        // Fallback de seguranca: se as maos sumirem, decreta empate tecnico
        if (!Array.isArray(hands) || hands.length < 4) {
            return { winTeam: -1, detail: "Erro na contagem das pecas.", isDraw: true, points: 0 };
        }

        // Soma das pecas da Equipe A (Jogadores 0 e 2)
        const sumA = window.Referee._sumHandPoints(hands[0]) + window.Referee._sumHandPoints(hands[2]);
        
        // Soma das pecas da Equipe B (Jogadores 1 e 3)
        const sumB = window.Referee._sumHandPoints(hands[1]) + window.Referee._sumHandPoints(hands[3]);

        let winTeam = -1; // -1 indica empate tecnico (raro, mas possivel no domino)
        let detail = `Sua Dupla: ${sumA} pts | Oponentes: ${sumB} pts`; // Texto ajustado para a UI

        if (sumA < sumB) {
            winTeam = 0; // Vitoria da Dupla A
        } else if (sumB < sumA) {
            winTeam = 1; // Vitoria da Dupla B
        }

        return {
            winTeam: winTeam,
            detail: detail,
            isDraw: (winTeam === -1),
            points: (winTeam !== -1) ? 1 : 0 // A rodada vale 1 ponto
        };
    },

    /**
     * Valida se um jogador realmente "bateu" (esvaziou a mao).
     */
    checkWin: function(hand) {
        return Array.isArray(hand) && hand.length === 0;
    },

    /**
     * Funcao auxiliar (privada) para somar os pontos de uma mao especifica.
     */
    _sumHandPoints: function(hand) {
        if (!Array.isArray(hand)) return 0;
        // Valida se a peca tem valores numericos antes de somar, prevenindo "NaN" (Not a Number)
        return hand.reduce((total, tile) => total + (tile[0] || 0) + (tile[1] || 0), 0);
    }
};