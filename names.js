/* 
   ========================================================================
   NAMES.JS - GERENCIAMENTO DE NOMES E PERSISTENCIA (VERSAO BLINDADA)
   Controla os apelidos dos jogadores e salva as preferencias no navegador.
   ======================================================================== 
*/

/**
 * 2. ESTADO INICIAL
 * Registro base dos ocupantes das cadeiras exportado para window.
 */

window.PLAYER_NAMES = {
    0: window.safeGetStorage('userName', "VOCE"),
    1: "ROBO A",
    2: "ROBO B",
    3: "ROBO C"
};

/**
 * 3. GERENCIADOR DE NOMES (NameManager)
 * Interface central para leitura e escrita de apelidos.
 */

window.NameManager = {
    // Retorna o dicionario completo (util para o Host enviar via rede)
    getAll: () => window.PLAYER_NAMES,
    
    // Busca o nome de uma cadeira especifica com fallback de seguranca
    get: (idx) => {
        const name = window.PLAYER_NAMES[idx];
        return (typeof name === 'string' && name.trim().length > 0) 
            ? name 
            : `JOGADOR ${parseInt(idx) + 1}`;
    },
    
    // Altera e higieniza o nome de um jogador
    set: (idx, name) => {
        if (typeof name !== 'string' || name.trim() === '') return;
        
        // Limpeza: 10 caracteres, sem espacos nas bordas e em MAIUSCULO
        const sanitized = name.trim().substring(0, 10).toUpperCase();
        window.PLAYER_NAMES[idx] = sanitized;

        // Se for o jogador local (cadeira 0), salva para o proximo acesso
        if (idx === 0) {
            window.safeSetStorage('userName', sanitized);
        }
    },
    
    // Atualiza todos os nomes de uma vez (usado por Clientes no Multiplayer ao sincronizar com o Host)
    updateAll: (newNames) => {
        if (newNames && typeof newNames === 'object') {
            // Mescla os nomes recebidos garantindo que nao perderemos a referencia do objeto principal
            window.PLAYER_NAMES = { ...window.PLAYER_NAMES, ...newNames };
        }
    }
};