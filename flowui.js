/* 
   ========================================================================
   FLOWUI.JS - O CERIMONIALISTA (VERSÃO BLINDADA)
   Gerencia fluxos de encerramento, transições de rodadas e diálogos.
   ======================================================================== 
*/

window.FlowUI = {
    /**
     * Limpa a interface para preparar o início de uma nova rodada.
     * Resolve o erro: FlowUI.resetForNewRound is not a function.
     */
    resetForNewRound: function() {
        // 1. Esconde qualquer overlay de resultado que esteja visível
        const resArea = document.getElementById('result-area');
        if (resArea) resArea.style.display = 'none';

        // 2. Limpa o destaque de vitória das mãos dos jogadores
        for (let i = 0; i < 4; i++) {
            const handEl = document.getElementById(`hand-${i}`);
            if (handEl) {
                handEl.classList.remove('hand-win-blink');
                handEl.classList.remove('active-turn');
            }
        }

        // 3. Garante que o seletor de lado (Cima/Baixo) seja fechado
        const picker = document.getElementById('side-picker');
        if (picker) picker.style.display = 'none';

        console.log("FlowUI: Interface limpa para nova rodada.");
    },

    /**
     * Gerencia a exibição visual do fim de uma rodada.
     */
    endRound: function(winTeam, idx, msg, detail = '') {
        // 1. Revela as mãos de todos para transparência
        if (typeof window.Renderer !== 'undefined' && typeof window.Renderer.drawHands === 'function') {
            window.Renderer.drawHands(true);
        }
        
        // 2. Atualiza o placar no Dashboard
        if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.updateScore === 'function') {
            window.Dashboard.updateScore();
        }
        
        // 3. Feedback sonoro
        if (winTeam !== -1 && typeof window.playVictory === 'function') {
            window.playVictory();
        }
        
        // 4. Efeito visual de brilho nas mãos da dupla vencedora
        this._highlightWinningTeam(winTeam);

        // 5. Verifica se a partida inteira acabou (Meta de vitórias)
        // Fallback seguro caso STATE demore a responder
        const target = (window.STATE && window.STATE.targetScore) ? window.STATE.targetScore : 10;
        const scoreA = (window.STATE && window.STATE.scores) ? window.STATE.scores[0] : 0;
        const scoreB = (window.STATE && window.STATE.scores) ? window.STATE.scores[1] : 0;
        
        const isMatchOver = (scoreA >= target || scoreB >= target);
        
        if (isMatchOver) {
            this._handleMatchEnd(target);
        } else {
            this._startNextRoundCountdown(msg);
        }
    },

    /**
     * Diálogo de confirmação para sair.
     */
    exitGame: function() {
        if (confirm("Deseja mesmo sair e encerrar a partida?")) {
            window.location.reload();
        }
    },

    /**
     * Aplica brilho visual nas mãos da dupla vencedora.
     * @private
     */
    _highlightWinningTeam: function(winTeam) {
        if (winTeam === -1) return;
        
        const teamMembers = (winTeam === 0) ? [0, 2] : [1, 3];
        teamMembers.forEach(pIdx => {
            // Converte índice global para índice de visão local
            const viewIdx = (pIdx - (window.myPlayerIdx || 0) + 4) % 4;
            const handEl = document.getElementById(`hand-${viewIdx}`);
            if (handEl) handEl.classList.add('hand-win-blink');
        });
    },

    /**
     * Encerramento definitivo da partida.
     * @private
     */
    _handleMatchEnd: function(target) {
        const myIdx = window.myPlayerIdx || 0;
        const scoreA = (window.STATE && window.STATE.scores) ? window.STATE.scores[0] : 0;
        
        const isMyTeamWinner = (scoreA >= target) 
            ? (myIdx % 2 === 0) 
            : (myIdx % 2 === 1);
            
        const finalMsg = isMyTeamWinner 
            ? "🏆 VOCÊS VENCERAM A PARTIDA!" 
            : "FIM DE JOGO: VITÓRIA DOS OPONENTES";

        if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.setMessage === 'function') {
            window.Dashboard.setMessage(finalMsg, 'active');
        }
        
        // Reinicia o jogo após 8 segundos para dar tempo de ver o placar final
        setTimeout(() => window.location.reload(), 8000);
    },

    /**
     * Contador regressivo para a próxima rodada.
     * @private
     */
    _startNextRoundCountdown: function(msg) {
        let timeLeft = 3;
        const timer = setInterval(() => {
            const statusMsg = `${msg} - Próxima rodada em ${timeLeft}s`;
            
            if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.setMessage === 'function') {
                window.Dashboard.setMessage(statusMsg, 'active');
            }
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
                // Chama o motor do jogo para iniciar nova rodada de forma segura
                if (typeof window.startRound === 'function') {
                    window.startRound();
                } else {
                    console.error('FlowUI: startRound não foi encontrado globalmente.');
                }
            }
        }, 1000);
    }
};