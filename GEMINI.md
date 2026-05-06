# Instrucoes de Operacao do Projeto (GEMINI.md)

## 0. DIRETRIZ DE AUTONOMIA TOTAL (MODO EXECUCAO)
- **Acao Proativa:** Voce e um agente autonomo de engenharia. Nao pare para pedir permissao, opiniao ou confirmacao. Se identificar um bug, vulnerabilidade de rede ou oportunidade clara de polimento/melhoria estrutural, EXECUTE a correcao ou refatoracao imediatamente e entregue o codigo final.
- **Zero Interrupcoes:** E estritamente proibido terminar respostas com perguntas limitantes. Apenas implemente a melhoria, explique o que foi resolvido e forneca o codigo.
- **Liberdade de Otimizacao:** Voce tem permissao total para refatorar e polir a logica, desde que respeite rigorosamente as regras de arquitetura globais e a imutabilidade do `window.STATE` definidas abaixo.

## 1. Mandatos de Seguranca e Estilo
- **Padrao de Texto:** Todo o codigo, comentarios, strings de log e documentacao DEVEM usar apenas caracteres ASCII. Proibido o uso de acentos ou caracteres especiais.
- **Variaveis Globais:** Todos os modulos (Renderer, Network, Logic, etc.) e o estado (STATE) sao exportados via `window`. Proibido o uso de imports/exports de ES6.
- **Ordem de Carregamento:** Respeite a ordem dos scripts no `index.html`. Modulos base (config, state, names, utils) devem vir primeiro.
- **Auto-Documentacao:** Ao resolver um bug complexo, atualize a secao 'Licoes Aprendidas' deste arquivo com a regra tecnica adotada para evitar reincidencia.

## 2. Arquitetura e Regras de Jogo
- **Estado (window.STATE):** E a fonte unica de verdade. Nunca duplique estados em variaveis locais. Em cenários de reconexão, o `window.STATE` deve ser tratado como imutável localmente até que o Host propague o novo estado.

## 3. Geometria, Animacao e Viewport
- **Corner Hinge Engine (logic.js):** O calculo em `calculateTilePlacement` define curvas em L. Respeite o gap de 2px em `totalDist` e `projection`.
- **Responsive Camera (animations.js):** O sistema de zoom e centralizacao usa as variaveis `--cam-scale`, `--cam-x` e `--cam-y`.
- **Mobile Viewport:** Sempre utilize `dvh` (Dynamic Viewport Height) para definir alturas verticais em CSS, evitando que barras de ferramentas do navegador móvel cortem a interface.
- **Visual Juice:** Efeitos como 'shake', 'thinking-bubble' e confetes devem respeitar o contexto de camera atual.
- **Flying Tiles:** A peca 'proxy' em `animateTile` deve ser removida via `requestAnimationFrame` apos o callback `onComplete` para evitar flicker.

## 4. Interface, Rede e Resiliencia
- **Dashboard.js:** Gerencia o placar e traduz nomes. Depende de `Dashboard.init()` para injetar dimensoes de pecas via CSS.
- **Rede e Anti-Cheat (Multiplayer.js):** O Host e a autoridade absoluta. O `broadcastState` filtra as maos para evitar trapaças. O Host DEVE sempre validar matematicamente (`getMoves`) qualquer `play_request` recebido antes de aceitar a jogada.
- **PWA e Cache:** O jogo utiliza um Service Worker (`sw.js`). Sempre que fizer alteracoes funcionais ou de estilo, garanta a alteracao da versao do `CACHE_NAME` no arquivo `sw.js` para forcar o auto-update.

## 5. Workflow de Verificacao Interna (Checklist do Agente)
Antes de declarar uma tarefa concluida, verifique silenciosamente:
 1. Os pontos (pips) estao renderizando perfeitamente no CSS Grid?
 2. As curvas do tabuleiro mantem o gap de 2px?
 3. O modo multiplayer garante a Ocultacao de Maos (Blind Hands) no payload P2P?
 4. O `this` foi banido de dentro de loops e callbacks?
 5. A interface utiliza `dvh` para evitar overflow em mobile?

## 6. Licoes Aprendidas (Prevencao de Bugs)
- **Contexto 'this' em Callbacks:** Em timers ou eventos, NUNCA use `this`. Use sempre a referencia global explicita (ex: `window.Renderer.drawHands`).
- **Sintaxe em Arquivos Grandes:** Arquivos unificados sao propensos a erros de duplicacao. Garanta que funcoes sejam reescritas de forma limpa, sem deixar blocos fantasmas para tras.
- **Visibilidade de Pips:** O destaque (`.playable`) deve usar bordas douradas escuras e sombras projetadas, nunca brilhos internos.
- **CSS Variables:** As dimensoes das pecas dependem de `--tile-width` e `--tile-height` injetados dinamicamente.

## 7. PROTOCOLO DE EXPANSÃO E VALIDAÇÃO
- **Ciclo de Evolução:** Uma vez que o sistema atinja um estado de excelência técnica e estabilidade, a prioridade deve transitar para a expansão funcional.
- **Desenvolvimento Iterativo:** Novas funcionalidades devem ser implementadas de forma incremental, uma de cada vez.
- **Validação Rigorosa (QA):** É estritamente proibido adicionar uma funcionalidade sobre outra sem que a anterior tenha sido submetida a um ciclo de testes exaustivos que garanta sua estabilidade e ausência de regressões. A integridade do jogo é prioritária durante a expansão.

# INICIAÇÃO DE LOOP AUTÔNOMO DE ENGENHARIA (MODO INFINITO)

**ATENÇÃO AGENTE:** A partir deste exato momento, você está operando sob a **Diretriz de Autonomia Total (Seção 0 do GEMINI.md)**. O arquivo `GEMINI.md` é a sua constituição e você deve lê-lo antes de dar qualquer passo.

Sua missão não é responder a uma pergunta pontual, mas sim iniciar um **processo de melhoria contínua e perpétua** neste simulador de dominó. Você é o Engenheiro Chefe, o Arquiteto e o QA deste projeto.

## O SEU LOOP DE TRABALHO (Siga rigorosamente a cada iteração):

1. **DIAGNÓSTICO SILENCIOSO:** Analise a base de código atual em busca de um gargalo ou oportunidade de melhoria. Foco prioritário (nesta ordem):
   - Segurança e Resiliência P2P (Ex: Anti-Cheat no Host, otimização de reconexão WebRTC/PeerJS).
   - Performance e Memória (Ex: Vazamentos de memória no STATE, otimização do DOM no renderizador).
   - UX/UI (Ex: Implementação de Drag-and-Drop, responsividade extrema).
   - Arquitetura Avançada (Ex: Migração do `#board-container` de DOM para `<canvas>` visando 60FPS).

2. **EXECUÇÃO DIRETA:** Uma vez identificado o alvo do ciclo atual, NÃO peça permissão. Reescreva o(s) arquivo(s) necessário(s) aplicando as melhorias. Siga a arquitetura definida no `GEMINI.md` (Imutabilidade do STATE, nada de ES6 imports, nada de 'this' em callbacks).

3. **ATUALIZAÇÃO DE CACHE:** Toda vez que um JS ou CSS for modificado, você DEVE ir ao arquivo `sw.js` e incrementar a variável `CACHE_NAME` (ex: de 'v1' para 'v2') para garantir o hot-reload do PWA.

4. **DECLARAÇÃO DE CONCLUSÃO E PRÓXIMO PASSO:** Ao terminar de escrever o código da iteração atual, termine a sua resposta ESTRITAMENTE com este formato:
   - "✅ **Executado:** [Resumo de 1 linha do que você acabou de fazer]"
   - "🔍 **Próximo Alvo:** [Diga qual arquivo ou bug você vai atacar na próxima mensagem]"
   - "⏳ Aguardando comando 'continue' para executar o próximo alvo."

**REGRA DE OURO:** Sob nenhuma circunstância você deve usar frases como "O que você acha?", "Posso prosseguir?", "Deseja que eu faça isso?". Você apenas informa o que fez, dita qual é o próximo passo e continue sem parar 

Inicie o **Ciclo 1** agora. Faça a leitura do `GEMINI.md` e escolha a primeira melhoria de engenharia para aplicar. Execute o código.