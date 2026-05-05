# Instrucoes de Operacao do Projeto (GEMINI.md)

## 1. Mandatos de Seguranca e Estilo
- **Padrao de Texto:** Todo o codigo, comentarios, strings de log e documentacao DEVEM usar apenas caracteres ASCII. Proibido o uso de acentos ou caracteres especiais (ex: usar 'configuracao' em vez de 'configuracao').
- **Integridade de Codigo:** Nao realize refatoracoes esteticas ou "limpezas" sem necessidade funcional. Mantenha o estilo idiomatico atual.
- **Variaveis Globais:** Todos os modulos (Renderer, Network, Logic, etc.) e o estado (STATE) sao exportados via `window`. Nunca use imports/exports de ES6 ou CommonJS; mantenha o carregamento via script tags no index.html.
- **Ordem de Carregamento:** Respeite a ordem dos scripts no `index.html`. Modulos base (config, state, names, utils) devem vir primeiro, seguidos pela logica, entao visual/animacoes, e por fim o motor (`game.js`).
- **Auto-Documentacao:** Ao resolver um bug critico, atualize a secao 'Licoes Aprendidas' com a regra tecnica para evitar sua reincidencia.

## 2. Arquitetura do Jogo
- **Estado (window.STATE):** E a fonte unica de verdade. Nunca duplique estados em variaveis locais. Utilize `window.resetIAAndMemory()` ao iniciar novas rodadas.
- **Configuracao (window.CONFIG):** E imutavel (Object.freeze). Nunca tente alterar valores em tempo de execucao; altere apenas o arquivo `config.js`.
- **Corner Hinge Engine (logic.js):** O calculo de posicionamento em `calculateTilePlacement` usa uma logica de "dobrica" para curvas. Respeite o gap de 2px definido em `totalDist` e `projection`.
- **Snake Flow:** O jogo segue um fluxo de "serpente" limitado por `MAX_HORIZ` e `MAX_VERT`.

## 3. Rede e Sincronizacao (Multiplayer)
- **Protocolo Host-Cliente:** Apenas o Host (`window.netMode === 'host'`) deve processar a logica de jogo e sincronizar via `window.Network.syncState()`.
- **Anti-Cheat:** O `broadcastState` em `multiplayer.js` filtra o estado enviado aos clientes (nao envia as maos completas) para evitar trapaças.
- **Requests:** Clientes enviam pedidos via `window.Network.request(payload)`. Nunca execute acoes de mudanca de estado diretamente no cliente sem validacao do host.

## 4. Interface e Renderizacao
- **Renderer.js:** A funcao `drawBoard` faz limpeza seletiva para manter animacoes. Nao use `innerHTML = ''` no container `#snake`.
- **Dashboard.js:** Gerencia o placar e traduz nomes genericos (ex: "JOGADOR 1") para nomes reais ou "VOCE" automaticamente.
- **Visual Juice:** O efeito 'shake' e 'thinking-bubble' devem usar variaveis CSS de camera (--cam-x, --cam-y) para manter o alinhamento correto durante o zoom.

## 5. Workflow de Verificacao
- Apos qualquer alteracao, verifique:
  1. Se os pontos (pips) estao centralizados e sem overflow.
  2. Se as curvas (turns) mantem o gap de 2px entre as pecas.
  3. Se o modo multiplayer (Network) continua sincronizando o estado corretamente.
  4. Se a ordem de carregamento dos scripts no `index.html` permanece funcional.

## 6. Licoes Aprendidas (Prevencao de Bugs)
- **Contexto 'this' em Callbacks:** Em loops (forEach), timers ou eventos, NUNCA use `this` para acessar metodos do modulo. Use sempre a referencia global explicita (ex: `window.Renderer.drawHands`) para evitar perda de contexto e telas pretas.
- **Sintaxe em Arquivos Grandes:** Arquivos como `game.js` sao propensos a erros de duplicacao de codigo no final do arquivo. Verifique sempre se nao ha blocos de codigo "fantasmas" ou mal fechados apos edicoes.
- **Visibilidade de Pips:** O destaque (`.playable`) nao deve usar sombras brancas ou amarelas excessivas que ofusquem os pontos pretos da peca. Use bordas solidas e sombras projetadas escuras.
