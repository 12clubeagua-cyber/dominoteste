# Instrucoes de Operacao do Projeto (GEMINI.md)

## 1. Mandatos de Seguranca e Estilo
- **Padrao de Texto:** Todo o codigo, comentarios, strings de log e documentacao DEVEM usar apenas caracteres ASCII. Proibido o uso de acentos ou caracteres especiais.
- **Integridade de Codigo:** Nao realize refatoracoes esteticas ou "limpezas" sem necessidade funcional.
- **Variaveis Globais:** Todos os modulos (Renderer, Network, Logic, etc.) e o estado (STATE) sao exportados via `window`. Proibido o uso de imports/exports de ES6.
- **Ordem de Carregamento:** Respeite a ordem dos scripts no `index.html`. Modulos base (config, state, names, utils) devem vir primeiro.
- **Auto-Documentacao:** Ao resolver um bug critico, atualize a secao 'Licoes Aprendidas' com a regra tecnica para evitar sua reincidencia.

## 2. Arquitetura e Regras de Jogo
- **Estado (window.STATE):** E a fonte unica de verdade. Nunca duplique estados em variaveis locais.
- **Inicio de Partida (Referee.js):** Na primeira rodada, quem tiver a Bucha de Seis (6-6) comeca. Nas demais, o vencedor da rodada anterior comeca.
- **Jogo Trancado (Referee.js):** Se ninguem tiver jogada, ganha a dupla com a MENOR soma de pontos nas maos.
- **IA (bots.js):** As decisoes usam pesos (`calculateWeight`). O modo 'hard' simula a proxima jogada do oponente para aplicar bloqueios.

## 3. Geometria e Animacao
- **Corner Hinge Engine (logic.js):** O calculo em `calculateTilePlacement` define curvas em L. Respeite o gap de 2px em `totalDist` e `projection`.
- **Responsive Camera (animations.js):** O sistema de zoom e centralizacao usa as variaveis `--cam-scale`, `--cam-x` e `--cam-y`. Qualquer efeito visual (shake, bubbles) deve se basear nessas variaveis para manter o alinhamento.
- **Flying Tiles:** A peca 'proxy' em `animateTile` deve ser removida via `requestAnimationFrame` apos o callback `onComplete` para evitar flicker.

## 4. Rede e Sincronizacao
- **Protocolo Host-Cliente:** Apenas o Host processa a logica e envia `syncState()`.
- **Anti-Cheat:** O `broadcastState` filtra as maos dos jogadores para que clientes nao vejam peças ocultas via console.

## 5. Workflow de Verificacao
- Apos qualquer alteracao, verifique:
  1. Se os pontos (pips) estao centralizados e vermelhos nas buchas (maos).
  2. Se as curvas mantem o gap de 2px.
  3. Se o modo multiplayer sincroniza sem revelar maos ocultas.
  4. Se o 'this' nao esta sendo usado dentro de loops/callbacks no Renderer.

## 6. Licoes Aprendidas (Prevencao de Bugs)
- **Contexto 'this' em Callbacks:** Em loops (forEach), timers ou eventos, NUNCA use `this`. Use sempre a referencia global explicita (ex: `window.Renderer.drawHands`).
- **Sintaxe em Arquivos Grandes:** Arquivos como `game.js` sao propensos a erros de duplicacao de codigo no final do arquivo. Verifique se nao ha blocos "fantasmas" apos edicoes.
- **Visibilidade de Pips:** O destaque (`.playable`) deve usar bordas douradas escuras e sombras projetadas, nunca brilhos internos que ofusquem os pontos.
- **CSS Variables:** As dimensoes das pecas dependem de `--tile-width` e `--tile-height` injetados via `Dashboard.init()`. Se as pecas sumirem, verifique se esta funcao foi chamada.
