// sfx.js — gestione suoni (.wav) per Skullory
const SFX = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
const sfxMaster = ctx.createGain();
sfxMaster.gain.value = 1.0;     // 👈 +40% volume globale degli effetti
sfxMaster.connect(ctx.destination);

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

 src.connect(gain).connect(sfxMaster);

  try { src.start(); } catch(e){}

  // ⬇️ Ducking musica: abbassa leggermente la BGM per ~220ms sui colpi "forti"
  try {
    if (window.BGM) {
      const loud = new Set(['ok','fail','win','lose','skull','reshuffle','bonus5']);
      if (loud.has(name)) BGM.duck();
    }
  } catch(_) {}
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
  audio = new Audio('./sounds/bgm.mp3');
  audio.loop = true;
  audio.preload = 'auto';

  // default molto basso + tetto massimo
  const maxDefault = 0.05;
  const fallback   = 0.01;
  const saved = parseFloat(localStorage.getItem('skullory_bgm_vol') || String(fallback));
  const initial = isNaN(saved) ? fallback : Math.min(saved, maxDefault);
  audio.volume = initial;

  // migrazione: se c'era un volume salvato troppo alto, abbassalo una volta
  try {
    if (!isNaN(saved) && saved > maxDefault) {
      localStorage.setItem('skullory_bgm_vol', String(maxDefault));
    }
  } catch(_) {}
}


async function start() {
  ensureAudio();
  if (!enabled) return;
  try { await audio.play(); } catch (e) {}
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
  const clamped = Math.max(0, Math.min(1, v));
  audio.volume = clamped;
  localStorage.setItem('skullory_bgm_vol', String(clamped)); // ✅ salva
}

function duck() {
  if (!audio || audio.paused) return;
  const base = audio.volume;
  const drop = Math.min(0.06, Math.max(0.03, base * 0.9)); // abbassa di più (min 0.03, max 0.06)
  audio.volume = Math.max(0, base - drop);
  clearTimeout(duck._t);
  duck._t = setTimeout(() => { audio.volume = base; }, 360); // resta abbassata un filo più a lungo
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

