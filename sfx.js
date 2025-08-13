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