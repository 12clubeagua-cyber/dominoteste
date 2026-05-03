/* 
   GERENCIADOR DE NOMES (names.js)
 */

function safeGetStorage(key, defaultValue) {
    try {
        return localStorage.getItem(key) || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {}
}

let PLAYER_NAMES = {
    0: safeGetStorage('userName', "VOCE"),
    1: "ROBO A",
    2: "ROBO B",
    3: "ROBO C"
};

const NameManager = {
    getAll: () => PLAYER_NAMES,
    
    get: (idx) => {
        const name = PLAYER_NAMES[idx];
        return (typeof name === 'string' && name.length > 0) ? name : `JOGADOR ${parseInt(idx) + 1}`;
    },
    
    set: (idx, name) => {
        if (typeof name !== 'string' || name.trim() === '') return;
        const sanitized = name.trim().substring(0, 10).toUpperCase();
        PLAYER_NAMES[idx] = sanitized;
        if (idx === 0) {
            safeSetStorage('userName', sanitized);
        }
    },
    
    updateAll: (newNames) => {
        PLAYER_NAMES = newNames;
    }
};


