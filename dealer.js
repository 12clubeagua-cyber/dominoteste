/* 
   ========================================================================
   DEALER.JS - O CRUPIER (VERSAO BLINDADA)
   Responsavel por gerar, embaralhar e distribuir as pecas.
   ======================================================================== 
*/

window.Dealer = {
    /**
     * Gera as 28 pecas classicas do domino (0-0 ate 6-6).
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
     * Algoritmo de alta performance e justica estatistica.
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
     * Divide o deck em 4 maos de 7 pecas.
     * Inclui trava de seguranca para evitar erros com decks incompletos.
     */
    distribute: function(deck) {
        // --- Failsafe: Garante que ninguem receba menos pecas do que deveria ---
        if (!Array.isArray(deck) || deck.length < 28) {
            console.error("Dealer: Deck incompleto ou invalido para distribuicao!");
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