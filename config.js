/* 
   CONFIGURACOES GERAIS (config.js)
 */
const CONFIG = Object.freeze({
  BOT: {
    MIN_DELAY: 900,
    MAX_DELAY: 1300,
    THINKING_MSG: " PENSANDO..."
  },
  GAME: {
    TILE_W: 18,           // Largura da peca (lado curto)
    TILE_L: 36,           // Comprimento da peca (lado longo)
    RESULT_DISPLAY_TIME: 7,
    PASS_DISPLAY_TIME: 2500,
    START_DELAY: 1200,
    SNAKE_MAX_SCALE: 1.2,
    MAX_VERT: 6,
    MAX_HORIZ: 2
  },
  AUDIO: {
    CLACK_FREQ: 800,
    PASS_FREQ: 300,
    DUR: 0.1
  }
});


