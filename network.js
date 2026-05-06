/* 
   ========================================================================
   NETWORK.JS - O ADAPTADOR DE REDE (VERSAO BLINDADA)
   Abstrai toda a comunicacao P2P, tanto para o Host quanto para o Cliente.
   ======================================================================== 
*/

window.Network = {
    isHost: () => window.netMode === 'host',
    isClient: () => window.netMode === 'client',

    /**
     * Validação estrita de tipos para payloads de rede.
     */
    _validatePayload: (payload) => {
        if (!payload || typeof payload !== 'object') return false;
        if (typeof payload.type !== 'string') return false;
        return true;
    },

    sync: (payload) => {
        if (!window.Network._validatePayload(payload)) {
            console.error("Network: Tentativa de sincronizacao com payload invalido!");
            return;
        }
        if (window.Network.isHost()) {
            if (typeof window.broadcastToClients === 'function') {
                window.broadcastToClients(payload);
            }
        }
    },

    syncState: () => {
        if (window.Network.isHost()) {
            if (typeof window.broadcastState === 'function') {
                window.broadcastState();
            }
        }
    },

    sendStatus: (text, cls) => {
        if (typeof window.updateStatusLocal === 'function') {
            window.updateStatusLocal(text, cls);
        }
        
        if (window.Network.isHost()) {
            window.Network.sync({ type: 'status', text, cls });
        }
    },

    request: (payload) => {
        if (!window.Network._validatePayload(payload)) return;
        
        if (window.Network.isClient()) {
            if (window.myConnToHost && window.myConnToHost.open) {
                window.myConnToHost.send(payload);
            } else {
                console.warn("Network: Falha na conexao P2P.");
            }
        }
    }
};