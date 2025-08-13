// sfx.js — gestione suoni (.wav) per Skullory
const SFX = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const buffers = {};
  const base = 'sounds/';

  const manifest = {
    tap:       'tap_card.wav',
    flip:      'flip_card.wav',
    ok:        'pair_ok.wav',
    fail:      'pair_fail.wav',
    bonus1:    'bonus_tick.wav',
    bonus5:    'bonus_streak.wav',
    reshuffle: 'reshuffle.wav',
    skull:     'skull_reveal.wav',
    win:       'win.wav',
    lose:      'lose.wav'
  };

  function loadOne(name, file){
    return fetch(base + file)
      .then(r => r.arrayBuffer())
      .then(ab => new Promise(res => ctx.decodeAudioData(ab, res)))
      .then(buf => { buffers[name] = buf; })
      .catch(()=>{});
  }

  async function init(){
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch(e){}
    }
    await Promise.all(Object.entries(manifest).map(([k,f]) => loadOne(k,f)));
    // “warm up” silenzioso per ridurre la latenza al primo play
    play('tap', { volume: 0.0001 });
  }

  function play(name, { rate=1.0, volume=1.0 } = {}){
    const buf = buffers[name];
    if(!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    try { src.start(); } catch(e){}
  }

  return { init, play };
})();
// ====== BGM (musica di fondo) ======
const BGM = (() => {
  let audio = null;
  let enabled = JSON.parse(localStorage.getItem('skullory_bgm_enabled') || 'true'); // di default ON
  let userHasInteracted = false;

  function ensureAudio() {
    if (audio) return;
    audio = new Audio('./sounds/bgm.mp3'); // <-- cambia se usi .wav
    audio.loop = true;          // loop continuo
    audio.volume = 0.16;        // volume basso
    audio.preload = 'auto';
  }

  async function start() {
    ensureAudio();
    if (!enabled) return;
    try {
      await audio.play();
    } catch (e) {
      // Autoplay bloccato: riproveremo al prossimo gesto
    }
  }
  function stop() {
    if (audio) audio.pause();
  }
  function setEnabled(v) {
    enabled = !!v;
    localStorage.setItem('skullory_bgm_enabled', JSON.stringify(enabled));
    if (enabled) start(); else stop();
    updateUi();
  }
  function toggle() { setEnabled(!enabled); }

  function setVolume(v) {
    ensureAudio();
    audio.volume = Math.max(0, Math.min(1, v));
  }

  // Riduci leggermente la musica quando suonano gli SFX (ducking leggero)
  function duck() {
    if (!audio || audio.paused) return;
    const base = parseFloat(localStorage.getItem('skullory_bgm_vol') || '0.16');
    audio.volume = Math.max(0, base - 0.06);
    clearTimeout(duck._t);
    duck._t = setTimeout(() => { audio.volume = base; }, 220);
  }

  // UI helper (aggiorna icona se presente)
  function updateUi() {
    const btn = document.getElementById('bgm-toggle');
    if (!btn) return;
    btn.textContent = enabled ? '🎵' : '🔇';
    btn.title = enabled ? 'Disattiva musica' : 'Attiva musica';
  }

  // riparti/ferma in base alla visibilità pagina
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (enabled && userHasInteracted) start();
  });

  // esponi API
  return { start, stop, toggle, setEnabled, setVolume, duck, updateUi, _markInteracted(){ userHasInteracted=true; } };
})();
window.BGM = BGM;

// Integra col tuo SFX.init() (se esiste):
// - chiama BGM.start() al primo gesto utente
// - richiama BGM.duck() quando suoni un effetto forte
