// sfx.js — gestione suoni (.wav) per Skullory
const SFX = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
const sfxMaster = ctx.createGain();
// volume master SFX (persistente). Default 1.0 (puoi alzare fino a 4x)
const savedSfxVol = parseFloat(localStorage.getItem('skullory_sfx_vol') || '2.5');
sfxMaster.gain.value = isNaN(savedSfxVol) ? 1 : Math.max(0, Math.min(4, savedSfxVol));
sfxMaster.connect(ctx.destination);

function setMasterVolume(v){
  const val = Math.max(0, Math.min(4, Number(v)));
  sfxMaster.gain.value = val;
  try { localStorage.setItem('skullory_sfx_vol', String(val)); } catch(_) {}
}
function getMasterVolume(){ return sfxMaster.gain.value; }

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


  return { init, play, setMasterVolume, getMasterVolume };
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

    // volume iniziale (persistente)
    const fallback = 0.08;
    const saved = parseFloat(localStorage.getItem('skullory_bgm_vol') || '');
    const initial = isNaN(saved) ? fallback : Math.max(0, Math.min(1, saved));
    audio.volume = initial;
  } // <-- ✅ CHIUDE ensureAudio()

  async function start() {
    ensureAudio();
    if (!enabled) return;
    try {
      await audio.play();
    } catch (e) {
      // Autoplay bloccato: riproveremo al prossimo gesto
    }
  }

  function stop() { if (audio) audio.pause(); }

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
    localStorage.setItem('skullory_bgm_vol', String(clamped));
  }

  // Ducking sugli SFX forti
  let _duckTimer = null;
  let _duckBase = null;
  function duck() {
    ensureAudio();
    if (!audio || audio.paused) return;
    if (_duckBase == null) _duckBase = audio.volume;

    const base = _duckBase;
    const drop = Math.min(0.06, Math.max(0.03, base * 0.9));
    const minVol = Math.max(0.01, base * 0.5);
    audio.volume = Math.max(minVol, base - drop);

    clearTimeout(_duckTimer);
    _duckTimer = setTimeout(() => {
      audio.volume = _duckBase;
      _duckBase = null;
    }, 360);
  }

  function updateUi() {
    const btn = document.getElementById('bgm-toggle');
    if (!btn) return;
    btn.textContent = enabled ? '🎵' : '🔇';
    btn.title = enabled ? 'Disattiva musica' : 'Attiva musica';
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (enabled && userHasInteracted) start();
  });

  return {
    start, stop, toggle, setEnabled, setVolume, duck, updateUi,
    _markInteracted(){ userHasInteracted = true; }
  };
})();
window.BGM = BGM;

// Integra col tuo SFX.init() (se esiste):
// - chiama BGM.start() al primo gesto utente
// - richiama BGM.duck() quando suoni un effetto forte
