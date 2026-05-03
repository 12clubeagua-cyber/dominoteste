/* 
   UTILIDADES (utils.js)
 */

const PIP_PATTERNS = Object.freeze({
    0: '',
    1: '<div class="pip" style="grid-area:2/2"></div>',
    2: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div>',
    3: '<div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div>',
    4: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    5: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/2"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>',
    6: '<div class="pip" style="grid-area:1/1"></div><div class="pip" style="grid-area:1/3"></div><div class="pip" style="grid-area:2/1"></div><div class="pip" style="grid-area:2/3"></div><div class="pip" style="grid-area:3/1"></div><div class="pip" style="grid-area:3/3"></div>'
});

function getPips(v) {
  // Validacao basica de integridade
  if (typeof v !== 'number' || v < 0 || v > 6) return '';
  return PIP_PATTERNS[v] || '';
}


