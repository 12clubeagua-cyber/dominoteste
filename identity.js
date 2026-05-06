/* 
   ========================================================================
   IDENTITY.JS - O CARTÓRIO (VERSÃO BLINDADA)
   Gerencia a identidade do jogador local e sua persistência.
   ======================================================================== 
*/

window.Identity = {
    STORAGE_KEY: 'userName',

    /**
     * Retorna o nome salvo ou o padrão 'JOGADOR'.
     * Utiliza o safeGetStorage criado no utils.js para evitar crash em aba anônima.
     */
    get: function() {
        return window.safeGetStorage(window.Identity.STORAGE_KEY, 'JOGADOR');
    },

    /**
     * Valida e salva o nome do jogador.
     */
    set: function(rawName) {
        if (!rawName) return false;
        
        const cleaned = rawName.trim().toUpperCase();
        
        // Regra: Apenas letras, espaços, entre 1 e 10 caracteres
        if (cleaned.length > 0 && cleaned.length <= 10 && /^[A-ZÁ-Ú ]+$/.test(cleaned)) {
            
            // Salva de forma segura
            window.safeSetStorage(window.Identity.STORAGE_KEY, cleaned);
            
            // Sincroniza com o gerenciador global
            if (typeof window.NameManager !== 'undefined') {
                window.NameManager.set(0, cleaned); 
            }
            return true;
        }
        return false;
    },

    /**
     * Abre o prompt para alteração de nome com validação em loop.
     */
    promptChange: function() {
        let valid = false;

        while (!valid) {
            const input = prompt("Digite seu apelido (até 10 letras, apenas A-Z):", window.Identity.get());
            
            // Se o usuário clicar em "Cancelar", interrompe
            if (input === null) break; 

            if (window.Identity.set(input)) {
                valid = true;
                // Notifica o Dashboard para atualizar os textos na tela
                if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.updateScore === 'function') {
                    window.Dashboard.updateScore();
                }
            } else {
                alert("Nome inválido. Use apenas letras (A-Z e acentos), entre 1 e 10 caracteres.");
            }
        }
    },

    /**
     * Verificação inicial ao carregar o jogo.
     */
    init: function() {
        const savedName = window.safeGetStorage(window.Identity.STORAGE_KEY, null);

        if (!savedName) {
            window.Identity.promptChange();
        } else {
            if (typeof window.NameManager !== 'undefined') {
                window.NameManager.set(0, savedName);
            }
        }
    }
};