/* 
   UTILIDADES (utils.js)
 */

// Cria um dicionário constante e "congelado" (imune a alterações acidentais feitas por outros arquivos).
// Este objeto mapeia o valor numérico da face do dominó para os elementos HTML visuais correspondentes.
const PIP_PATTERNS = Object.freeze({
    // Se for a face branca/vazia, retorna um texto vazio (não renderiza nada)
    0: '',
    // Define a coordenada exata no CSS Grid para desenhar o ponto central da face unitária
    1: '<div class="pip" style="grid-area:2/2"></div>',
    // Define as coordenadas nos cantos opostos para desenhar a segunda face
    2: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div>',
    // Soma os cantos opostos com o centro para compor a terceira face
    3: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div>',
    // Desenha pontos nos quatro cantos das extremidades para a quarta face
    4: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    // Combina os quatro cantos com o ponto centralizado para a quinta face
    5: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    // Distribui os pontos em duas colunas paralelas ocupando todas as linhas para a sexta face
    6: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/1"></div><div class="pip" style="grid-area:2/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>'
});

// Função responsável por entregar o pacote HTML correto de bolinhas para a interface visual
function getPips(v) {
  // Validacao basica de integridade
  // Verifica de forma rígida se o valor recebido é um número válido e se não excede os limites pré-estabelecidos do jogo atual
  if (typeof v !== 'number' || v < 0 || v > 6) return '';
  // Tenta puxar o HTML pronto do dicionário congelado. Se der erro ou a chave não existir (undefined), o '||' assume o controle e devolve vazio
  return PIP_PATTERNS[v] || '';
}
