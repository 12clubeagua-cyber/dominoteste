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
     * Utiliza o safeGetStorage criado no names.js para evitar crash em aba anônima.
     */
    get: function() {
        if (typeof window.safeGetStorage === 'function') {
            return window.safeGetStorage(this.STORAGE_KEY, 'JOGADOR');
        }
        // Fallback redundante caso names.js atrase no carregamento
        try { 
            return localStorage.getItem(this.STORAGE_KEY) || 'JOGADOR'; 
        } catch (e) { 
            return 'JOGADOR'; 
        }
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
            if (typeof window.safeSetStorage === 'function') {
                window.safeSetStorage(this.STORAGE_KEY, cleaned);
            } else {
                try { localStorage.setItem(this.STORAGE_KEY, cleaned); } catch(e) {}
            }
            
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
            const input = prompt("Digite seu apelido (até 10 letras, apenas A-Z):", this.get());
            
            // Se o usuário clicar em "Cancelar", interrompe
            if (input === null) break; 

            if (this.set(input)) {
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
        let savedName = null;
        
        // Tenta buscar o nome sem forçar o default ainda
        if (typeof window.safeGetStorage === 'function') {
            savedName = window.safeGetStorage(this.STORAGE_KEY, null);
        } else {
            try { savedName = localStorage.getItem(this.STORAGE_KEY); } catch(e) {}
        }

        if (!savedName) {
            this.promptChange();
        } else {
            if (typeof window.NameManager !== 'undefined') {
                window.NameManager.set(0, savedName);
            }
        }
    }
};