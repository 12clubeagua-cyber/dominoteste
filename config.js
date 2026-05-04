/* 
   CONFIGURACOES GERAIS (config.js)
 */

// Cria uma constante global chamada CONFIG e usa o 'Object.freeze'.
// O 'freeze' "congela" o objeto, garantindo que nenhuma outra parte do código 
// possa alterar esses valores acidentalmente durante a partida.
const CONFIG = Object.freeze({
  
  // Bloco de configurações do comportamento dos Bots (IA)
  BOT: {
    // Tempo mínimo de espera (em milissegundos) antes do bot jogar.
    // Isso simula o tempo de reação de um humano
    MIN_DELAY: 1,
    
    // Tempo máximo de espera para adicionar aleatoriedade na "demora" do bot.
    MAX_DELAY: 2,
    
    // O texto que vai aparecer no painel de status enquanto ocorre esse atraso simulado.
    THINKING_MSG: " PENSANDO..."
  },
  
  // Bloco de configurações gerais de proporção, visual e tempos do jogo
  GAME: {
    // Largura padrão de uma peça na matemática de renderização
    TILE_W: 18,           // Largura da peca (lado curto)
    
    // Comprimento padrão da peça.
    TILE_L: 36,           // Comprimento da peca (lado longo)
    
    // Tempo que a tela de resultado/fim de rodada fica exposta para os jogadores lerem em segundos
    RESULT_DISPLAY_TIME: 5,
    
    // Tempo em milissegundos que a mensagem ou efeito de "Passou a vez" fica visível na tela.
    PASS_DISPLAY_TIME: 2500,
    
    // Um breve atraso antes de liberar a primeira jogada, para os jogadores se situarem após o embaralhamento.
    START_DELAY: 1,
    
    // Limite de zoom máximo que a câmera do tabuleiro ("cobrinha") pode dar. 1.2 significa 120% do tamanho normal.
    SNAKE_MAX_SCALE: 1.2,
    
    // Limite máximo de peças empilhadas na vertical indo em linha reta antes de forçar a "cobrinha" a dobrar de direção (pra não sair da mesa).
    MAX_VERT: 5,
    
    // Limite máximo de peças na horizontal em linha reta antes de forçar a curva.
    MAX_HORIZ: 2
  },
  
  // Bloco de configurações de geração de som (Web Audio API)
  AUDIO: {
    // Frequência base em Hertz (Hz) para sintetizar o som agudo de "Clack" (peça batendo na mesa).
    CLACK_FREQ: 800,
    
    // Frequência mais grave (300Hz) para sintetizar o som de falha/negativo quando um jogador passa a vez.
    PASS_FREQ: 300,
    
    // Duração base de tempo (0.1 segundos ou 100ms) para que esses pequenos efeitos sonoros toquem antes de silenciar.
    DUR: 0.1
  }
});
