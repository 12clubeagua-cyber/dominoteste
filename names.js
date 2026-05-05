/* 
   ========================================================================
   NAMES.JS - GERENCIAMENTO DE NOMES E PERSISTÊNCIA (VERSÃO BLINDADA)
   Controla os apelidos dos jogadores e salva as preferências no navegador.
   ======================================================================== 
*/

/**
 * 1. PERSISTÊNCIA DE DADOS (STORAGE)
 * Funções seguras para ler e salvar no localStorage sem quebrar o jogo.
 * Exportadas globalmente.
 */

window.safeGetStorage = function(key, defaultValue) {
    try {
        return localStorage.getItem(key) || defaultValue;
    } catch (e) {
        // Fallback para abas anônimas ou bloqueio de cookies
        return defaultValue; 
    }
};

window.safeSetStorage = function(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // Falha silenciosa se o armazenamento estiver bloqueado
    }
};

/**
 * 2. ESTADO INICIAL
 * Registro base dos ocupantes das cadeiras exportado para window.
 */

window.PLAYER_NAMES = {
    0: window.safeGetStorage('userName', "VOCÊ"),
    1: "ROBÔ A",
    2: "ROBÔ B",
    3: "ROBÔ C"
};

/**
 * 3. GERENCIADOR DE NOMES (NameManager)
 * Interface central para leitura e escrita de apelidos.
 */

window.NameManager = {
    // Retorna o dicionário completo (útil para o Host enviar via rede)
    getAll: () => window.PLAYER_NAMES,
    
    // Busca o nome de uma cadeira específica com fallback de segurança
    get: (idx) => {
        const name = window.PLAYER_NAMES[idx];
        return (typeof name === 'string' && name.trim().length > 0) 
            ? name 
            : `JOGADOR ${parseInt(idx) + 1}`;
    },
    
    // Altera e higieniza o nome de um jogador
    set: (idx, name) => {
        if (typeof name !== 'string' || name.trim() === '') return;
        
        // Limpeza: 10 caracteres, sem espaços nas bordas e em MAIÚSCULO
        const sanitized = name.trim().substring(0, 10).toUpperCase();
        window.PLAYER_NAMES[idx] = sanitized;

        // Se for o jogador local (cadeira 0), salva para o próximo acesso
        if (idx === 0) {
            window.safeSetStorage('userName', sanitized);
        }
    },
    
    // Atualiza todos os nomes de uma vez (usado por Clientes no Multiplayer ao sincronizar com o Host)
    updateAll: (newNames) => {
        if (newNames && typeof newNames === 'object') {
            // Mescla os nomes recebidos garantindo que não perderemos a referência do objeto principal
            window.PLAYER_NAMES = { ...window.PLAYER_NAMES, ...newNames };
        }
    }
};