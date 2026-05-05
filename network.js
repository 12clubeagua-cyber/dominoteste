/* 
   ========================================================================
   NETWORK.JS - O ADAPTADOR DE REDE (VERSÃO BLINDADA)
   Abstrai toda a comunicação P2P, tanto para o Host quanto para o Cliente.
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
     * Sincroniza uma ação ou animação com todos os jogadores da sala.
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
     * Sincroniza o objeto STATE inteiro para garantir que todos estão no mesmo turno.
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
        // Atualiza a tela de quem disparou a função
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
     * Permite que o cliente envie pedidos (como jogar peça ou sentar).
     */
    request: (payload) => {
        if (window.Network.isClient()) {
            if (window.myConnToHost && window.myConnToHost.open) {
                window.myConnToHost.send(payload);
            } else {
                console.warn("Network: Tentativa de envio sem conexão ativa com o Host.");
                
                // Opcional: Se a conexão caiu, pode tentar forçar a reconexão visualmente
                if (typeof window.updateStatusLocal === 'function') {
                    window.updateStatusLocal("Conexão falhou. Aguarde...", "pass");
                }
            }
        }
    }
};