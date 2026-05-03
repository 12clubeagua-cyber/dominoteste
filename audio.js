/* 
   SISTEMA DE AUDIO (audio.js)
 */
function safeAudioInit() {
  try {
    if (!audioCtx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) audioCtx = new A();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) {}
}

window.addEventListener('pagehide', () => {
    if (audioCtx) audioCtx.close();
});

function playClack(freq = 800, dur = 0.1) {
  if (navigator.vibrate) try { navigator.vibrate(30); } catch(e) {}
  if (!audioCtx) return;
  
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + Math.max(dur, 0.1));
    gain.gain.setValueAtTime(0.45, audioCtx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + Math.max(dur, 0.1));
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start(); 
    osc.stop(audioCtx.currentTime + Math.max(dur, 0.1));
  } catch(e) {}
}

function playPass()    { playClack(300, 0.12); }
function playVictory() { 
  if (!audioCtx) return;
  [600, 800, 1000].forEach((f, i) => setTimeout(() => playClack(f, 0.1), i * 120)); 
}


