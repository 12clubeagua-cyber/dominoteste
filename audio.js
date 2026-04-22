/* ═══════════════════════════════════════════════════════
   SISTEMA DE ÁUDIO (audio.js)
═══════════════════════════════════════════════════════ */
function safeAudioInit() {
  try {
    if (!audioCtx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) audioCtx = new A();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) {}
}

function playClack(freq = 800, dur = 0.05) {
  if (navigator.vibrate) navigator.vibrate(30);
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(0.45, audioCtx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start(); 
    osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function playPass()    { playClack(300, 0.12); }
function playVictory() { [600, 800, 1000].forEach((f, i) => setTimeout(() => playClack(f, 0.1), i * 120)); }
