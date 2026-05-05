/* 
   ========================================================================
   NETWORK.JS - O ADAPTADOR DE REDE (VERSAO BLINDADA)
   Abstrai toda a comunicacao P2P, tanto para o Host quanto para o Cliente.
   ======================================================================== 
*/

window.Network = {
    /**
     * Auxiliares para verificar o papel do jogador
     */
    isHost: () => window.netMode === 'host',
    isClient: () => window.netMode === 'client',

    /**
     * [HOST -> CLIENTES]
     * Sincroniza uma acao ou animacao com todos os jogadores da sala.
     */
    sync: (payload) => {
        if (window.Network.isHost()) {
            if (typeof window.broadcastToClients === 'function') {
                window.broadcastToClients(payload);
            }
        }
    },

    /**
     * [HOST -> CLIENTES]
     * Sincroniza o objeto STATE inteiro para garantir que todos estao no mesmo turno.
     */
    syncState: () => {
        if (window.Network.isHost()) {
            if (typeof window.broadcastState === 'function') {
                window.broadcastState();
            }
        }
    },

    /**
     * [HOST -> CLIENTES / LOCAL]
     * Atualiza a barra de status local e de todos os convidados.
     */
    sendStatus: (text, cls) => {
        // Atualiza a tela de quem disparou a funcao
        if (typeof window.updateStatusLocal === 'function') {
            window.updateStatusLocal(text, cls);
        }
        
        // Se for o Host, replica a mensagem para as telas dos clientes
        if (window.Network.isHost()) {
            window.Network.sync({ type: 'status', text, cls });
        }
    },

    /**
     * [CLIENTE -> HOST]
     * Permite que o cliente envie pedidos (como jogar peca ou sentar).
     */
    request: (payload) => {
        if (window.Network.isClient()) {
            if (window.myConnToHost && window.myConnToHost.open) {
                window.myConnToHost.send(payload);
            } else {
                console.warn("Network: Tentativa de envio sem conexao ativa com o Host.");
                
                // Opcional: Se a conexao caiu, pode tentar forcar a reconexao visualmente
                if (typeof window.updateStatusLocal === 'function') {
                    window.updateStatusLocal("Conexao falhou. Aguarde...", "pass");
                }
            }
        }
    }
};