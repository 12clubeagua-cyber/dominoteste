/* 
   ========================================================================
   UTILS.JS - GERADOR DE PONTOS (PIPS) PRECISO
   ======================================================================== 
*/

window.getPips = function(val, color) {
    if (val === 0) return ''; // Peca branca

    // Mapeamento de posicoes para cada numero (1-6) num grid 3x3
    const layouts = {
        1: [5],
        2: [1, 9],
        3: [1, 5, 9],
        4: [1, 3, 7, 9],
        5: [1, 3, 5, 7, 9],
        6: [1, 3, 4, 6, 7, 9]
    };

    const activePips = layouts[val] || [];
    let html = '';
    
    // Define a cor se for passada (ex: para pecas bucha/carroca)
    const style = color ? `style="background:${color}"` : '';
    
    // Gera 9 espacos de grid, mas so coloca a classe 'pip' nos indices ativos
    for (let i = 1; i <= 9; i++) {
        if (activePips.includes(i)) {
            html += `<div class="pip" ${style}></div>`;
        } else {
            html += `<div></div>`; // Espaco vazio para manter o grid
        }
    }
    return html;
};