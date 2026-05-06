/* 
   ========================================================================
   CONFIG.JS - CONFIGURACOES GERAIS E CONSTANTES (VERSAO BLINDADA)
   Centraliza todos os parametros de equilibrio, visual e audio do jogo.
   Utiliza Object.freeze para garantir a imutabilidade dos dados globais.
   ======================================================================== 
*/

window.CONFIG = Object.freeze({
  
    // 1. COMPORTAMENTO DOS BOTS (IA)
    BOT: {
        MIN_DELAY: 600,         // Aumentado levemente para parecer mais humano
        MAX_DELAY: 1200,        // Da tempo do jogador ler o que o bot fez
        THINKING_MSG: " PENSANDO..."
    },

    // 2. REGRAS E PROPORCOES DO JOGO
    GAME: {
        // Dimensoes Fisicas das Pecas
        TILE_W: 18,            // Largura (lado curto)
        TILE_L: 36,            // Comprimento (lado longo)
        
        // Tempos de Fluxo (UX)
        RESULT_DISPLAY_TIME: 3, // Exibicao do placar final (segundos)
        PASS_DISPLAY_TIME: 1200, // Tempo do brilho de "Passou a vez"
        START_DELAY: 800,       // Pausa para o cerebro processar a mao nova
        
        // Camera e Tabuleiro (Snake)
        SNAKE_MAX_SCALE: 1.0,   // 1.0 evita distorcao de pixels em telas menores
        
        /* 
           AJUSTE DE CURVA:
           Valores maiores (6 a 8) criam retas mais elegantes.
           Valores pequenos (2) fazem o jogo virar muito rapido.
        */
        MAX_VERT: 6,            
        MAX_HORIZ: 6            
    },

    // 3. SINTESE DE AUDIO (WEB AUDIO API)
    AUDIO: {
        CLACK_FREQ: 800,       // Frequencia do impacto (agudo)
        PASS_FREQ: 220,        // Frequencia do passe (mais grave/alerta)
        DUR: 0.08              // Bipes mais curtos soam mais "secos" e profissionais
    }
});