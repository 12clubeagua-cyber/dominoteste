# Plano de Otimização Extrema - Windows 10 (Hardware Antigo)

Este plano foi desenvolvido para extrair o máximo de performance de um PC com 2 núcleos e 4GB de RAM DDR3, utilizando técnicas avançadas do GitHub e fóruns especializados (Reddit r/OptimizedGaming).

## 1. Scripts Automatizados de Alta Performance (GitHub)

Estes comandos devem ser executados no **PowerShell como Administrador** via Gemini CLI local:

*   **Chris Titus Tech Windows Utility (Recomendado):** Ferramenta completa para debloat, desativação de telemetria e ajustes de serviços.
    `irm christitus.com/win | iex`
    *Ação:* Na interface que abrir, use a aba **Tweaks**, selecione **Desktop** e aplique.

*   **Windows10Debloater (Deep Clean):** Remove apps nativos (UWP) e desativa a Cortana de forma agressiva.
    `iwr -useb https://git.io/debloat | iex`

*   **SophiApp / Sophia Script:** Para ajustes finos e avançados de privacidade e performance.
    [GitHub Link](https://github.com/Sophia-Community/SophiApp)

## 2. Ajustes Profundos de Registro e Sistema

### UI e Latência (Registro)
*   **MenuShowDelay:** `0` (Resposta instantânea de menus).
*   **VisualEffects:** Desativar animações, sombras e transparências.
*   **Win32PrioritySeparation:** `26` (Hex) para priorizar o tempo de resposta de janelas em primeiro plano.

### Memória e Processamento (O Gargalo de 4GB)
*   **Pagefile Fixo:** Definir tamanho fixo (ex: 4096-8192 MB) no SSD para evitar overhead de redimensionamento.
*   **SysMain (Superfetch):** Desativar completamente para aliviar a carga constante no disco e CPU.
*   **Windows Memory Cleaner:** Utilizar ferramenta open-source para limpeza periódica de cache de RAM.

## 3. Gerenciamento de Energia e Hardware

*   **Ultimate Performance:** Ativar o plano de energia oculto do Windows:
    `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61`
*   **Hibernação:** Desativar para economizar espaço no SSD e remover o processo de hibernação:
    `powercfg -h off`
*   **TRIM:** Verificar se o SSD está com TRIM ativo para manter a performance de escrita.

## 4. Limpeza de Background (Reddit r/Windows10)

*   **Telemetria de Tarefas Agendadas:** Desativar `Microsoft Compatibility Appraiser` e `Customer Experience Improvement Program`.
*   **Bing Search:** Desativar a integração do Bing na busca do Iniciar para reduzir uso de rede e RAM do `SearchHost.exe`.
*   **Offline Maps:** Desativar serviços de mapas e localização.

## 5. Estratégia de Execução via Gemini CLI Local

1.  **Backup:** Criar ponto de restauração imediato.
2.  **Fase 1 (Scripts):** Rodar o utilitário do Chris Titus primeiro.
3.  **Fase 2 (Registro):** Aplicar os ajustes de latência.
4.  **Fase 3 (Debloat):** Remover apps UWP pesados.
5.  **Monitoramento:** Validar ganho de RAM livre e redução de processos no Gerenciador de Tarefas.

---
*Este plano está pronto para ser processado pelo seu Gemini CLI local. Copie os comandos conforme necessário.*
