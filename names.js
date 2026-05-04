/* 
   GERENCIADOR DE NOMES (names.js)
 */

// Função de segurança para ler dados da memória permanente do navegador, exigindo a chave de busca e um valor de reserva
function safeGetStorage(key, defaultValue) {
    // Tenta executar a leitura normalmente (Navegadores em aba anônima costumam bloquear isso e gerar erros letais)
    try {
        // Retorna o valor salvo localmente se existir, ou o valor de reserva caso o campo esteja vazio
        return localStorage.getItem(key) || defaultValue;
    // Se ocorrer uma falha de permissão ou bloqueio do navegador
    } catch (e) {
        // Aborta a leitura e devolve o valor de reserva para o jogo continuar funcionando
        return defaultValue;
    }
}

// Função de segurança para salvar dados na memória permanente do navegador
function safeSetStorage(key, value) {
    // Tenta gravar a informação
    try {
        // Executa o comando nativo que injeta a chave e o valor no banco do navegador
        localStorage.setItem(key, value);
    // Se falhar (armazenamento cheio ou bloqueado por privacidade)
    } catch (e) {} // Ignora o erro de forma completamente silenciosa
}

// Cria o dicionário principal (objeto) que vai manter o registro de quem está sentado em qual cadeira
let PLAYER_NAMES = {
    // A cadeira primária tenta puxar o nome salvo do navegador ou usa o padrão de reserva para o dono do celular
    0: safeGetStorage('userName', "VOCE"),
    // Nome inicial padrão para o assento do oponente à esquerda
    1: "ROBO A",
    // Nome inicial padrão para o assento do parceiro logo à frente
    2: "ROBO B",
    // Nome inicial padrão para o assento do oponente à direita
    3: "ROBO C"
};

// Cria o Gerenciador Central, um objeto que controla o acesso e as mudanças nesse dicionário de nomes
const NameManager = {
    // Método que empacota e devolve a lista completa de nomes de uma vez só (útil para enviar via rede)
    getAll: () => PLAYER_NAMES,
    
    // Método para ler o nome de apenas uma cadeira específica
    get: (idx) => {
        // Puxa o nome registrado no dicionário usando a posição solicitada
        const name = PLAYER_NAMES[idx];
        // Verifica se é um texto válido e se não está vazio. Se estiver tudo certo, devolve o nome. Se estiver quebrado, constrói um apelido genérico somando o índice com a unidade básica.
        return (typeof name === 'string' && name.length > 0) ? name : `JOGADOR ${parseInt(idx) + 1}`;
    },
    
    // Método para alterar o nome de uma cadeira específica
    set: (idx, name) => {
        // Regra de segurança dura: se o que chegou não for texto ou for apenas espaços em branco, cancela a operação
        if (typeof name !== 'string' || name.trim() === '') return;
        // Limpeza de texto: tira espaços das pontas, corta o texto no limite de caracteres permitido e joga tudo para letra maiúscula
        const sanitized = name.trim().substring(0, 10).toUpperCase();
        // Substitui o nome antigo no dicionário oficial por esta versão limpa
        PLAYER_NAMES[idx] = sanitized;
        // Se a cadeira que teve o nome alterado for a do usuário dono do aparelho
        if (idx === 0) {
            // Usa a função segura para salvar esse nome novo no navegador para os próximos acessos
            safeSetStorage('userName', sanitized);
        }
    },
    
    // Método para atualizar absolutamente todos os nomes da mesa de uma vez
    updateAll: (newNames) => {
        // Sobrescreve o dicionário inteiro com o novo pacote (muito usado pelo cliente quando recebe a lista do Host)
        PLAYER_NAMES = newNames;
    }
};
