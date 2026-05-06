/* 
   ========================================================================
   AUDIO.JS - SISTEMA DE SOM SINTETIZADO (VERSAO BLINDADA)
   Gera efeitos sonoros matematicamente para economizar banda e memoria.
   ======================================================================== 
*/

/**
 * 1. GESTAO DE CONTEXTO
 * Inicializa e gerencia o ciclo de vida do motor de audio.
 */
window.safeAudioInit = function() {
    try {
        if (!window.audioCtx) {
            // Suporte para navegadores modernos e legados (Webkit)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) window.audioCtx = new AudioContextClass();
        }
        
        // O navegador exige que o audio seja "resumido" apos uma interacao do usuario
        if (window.audioCtx && window.audioCtx.state === 'suspended') {
            window.audioCtx.resume();
        }
    } catch (e) {
        console.warn("Motor de audio nao pode ser iniciado:", e);
    }
};

// Fecha o contexto ao sair da pagina para liberar memoria do dispositivo
window.addEventListener('pagehide', () => {
    if (window.audioCtx) {
        window.audioCtx.close();
    }
});

/**
 * 2. SINTESE DE SOM (CORE)
 * Gera o som de impacto das pecas ("Clack").
 */
window.playClack = function(freq, dur) {
    // Busca no CONFIG global com fallback de seguranca
    const finalFreq = freq ?? window.CONFIG?.AUDIO?.CLACK_FREQ ?? 800;
    const finalDur = dur ?? window.CONFIG?.AUDIO?.DUR ?? 0.1;

    // Feedback tatil (Vibracao) para dispositivos moveis
    if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (e) {}
    }

    if (!window.audioCtx) return;
    
    try {
        const osc = window.audioCtx.createOscillator();
        const gain = window.audioCtx.createGain();
        
        // Tipo de onda 'triangle' da um som mais "oco" parecido com madeira/resina
        osc.type = 'triangle'; 
        
        // Configuracao de Frequencia (Pitch)
        osc.frequency.setValueAtTime(finalFreq, window.audioCtx.currentTime); 
        // Sweep de frequencia: cai rapidamente para simular o impacto
        osc.frequency.exponentialRampToValueAtTime(80, window.audioCtx.currentTime + Math.max(finalDur, 0.1));
        
        // Configuracao de Volume (Gain)
        gain.gain.setValueAtTime(0.45, window.audioCtx.currentTime); 
        // Fade-out suave para evitar estalos (clicks) de audio
        gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + Math.max(finalDur, 0.1));
        
        // Conexoes: Oscilador -> Volume -> Saida (Alto-falantes)
        osc.connect(gain); 
        gain.connect(window.audioCtx.destination);
        
        osc.start(); 
        osc.stop(window.audioCtx.currentTime + Math.max(finalDur, 0.1));
    } catch (e) {
        console.error("Erro ao reproduzir som:", e);
    }
};

/**
 * 3. EFEITOS ESPECIALIZADOS
 * Sons especificos para eventos do jogo.
 */

// Som grave e curto para quando o jogador nao tem a peca
window.playPass = function() { 
    const passFreq = window.CONFIG?.AUDIO?.PASS_FREQ ?? 300;
    window.playClack(passFreq, 0.12); 
    window.speak("Passei");
};

// Sequencia de notas ascendentes para comemorar a vitoria
window.playVictory = function() { 
    if (!window.audioCtx) return;
    
    const notes = [600, 800, 1000];
    notes.forEach((freq, index) => {
        setTimeout(() => window.playClack(freq, 0.1), index * 120); 
    });
    window.speak("Ganhei");
};

/**
 * 4. SINTESE DE VOZ (SPEECH API)
 */
window.speak = function(text) {
    if (!window.speechSynthesis) return;
    // Cancela falas anteriores para nao encavalar
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1.1; // Levemente mais rapido
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
};

window.playShuffleSound = function() {
    if (!window.audioCtx) return;
    let count = 0;
    const interval = setInterval(() => {
        const freq = 200 + Math.random() * 400;
        window.playClack(freq, 0.05);
        if (++count > 15) clearInterval(interval);
    }, 80);
};