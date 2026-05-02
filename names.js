/* ═══════════════════════════════════════════════════════
   GERENCIADOR DE NOMES (names.js)
═══════════════════════════════════════════════════════ */

let PLAYER_NAMES = {
    0: localStorage.getItem('userName') || "VOCÊ",
    1: "ROBO A",
    2: "ROBO B",
    3: "ROBO C"
};

const NameManager = {
    getAll: () => PLAYER_NAMES,
    
    get: (idx) => PLAYER_NAMES[idx] || `JOGADOR ${parseInt(idx) + 1}`,
    
    set: (idx, name) => {
        PLAYER_NAMES[idx] = name;
        if (idx === 0) {
            localStorage.setItem('userName', name);
        }
    },
    
    updateAll: (newNames) => {
        PLAYER_NAMES = newNames;
    }
};
