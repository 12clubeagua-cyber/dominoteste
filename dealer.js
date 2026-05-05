/* 
   ========================================================================
   DEALER.JS - O CRUPIER (VERSÃO BLINDADA)
   Responsável por gerar, embaralhar e distribuir as peças.
   ======================================================================== 
*/

window.Dealer = {
    /**
     * Gera as 28 peças clássicas do dominó (0-0 até 6-6).
     */
    generateDeck: function() {
        const deck = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                deck.push([i, j]);
            }
        }
        return deck;
    },

    /**
     * Embaralhamento Fisher-Yates.
     * Algoritmo de alta performance e justiça estatística.
     */
    shuffle: function(deck) {
        if (!Array.isArray(deck)) return [];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    },

    /**
     * Divide o deck em 4 mãos de 7 peças.
     * Inclui trava de segurança para evitar erros com decks incompletos.
     */
    distribute: function(deck) {
        // --- Failsafe: Garante que ninguém receba menos peças do que deveria ---
        if (!Array.isArray(deck) || deck.length < 28) {
            console.error("Dealer: Deck incompleto ou inválido para distribuição!");
            return [[], [], [], []];
        }

        return [
            deck.splice(0, 7),
            deck.splice(0, 7),
            deck.splice(0, 7),
            deck.splice(0, 7)
        ];
    }
};