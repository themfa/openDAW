// Color & Noise transport bridge for openDAW (Spike B).
//
// Injected into openDAW's <head> after colornoise-tap.js. Publishes openDAW's
// transport (playing, position in PPQN, the engine AudioContext's clock) on a
// same-origin BroadcastChannel and accepts play/stop commands on it. Reads
// only the console-command surface openDAW already exports on window.opendaw
// (engine.play / engine.stop / engine.position / engine.isPlaying). No
// openDAW logic is touched.
//
// Caveat baked into the design: openDAW copies worklet state to the main
// thread inside its own requestAnimationFrame loop, so `position` only
// advances while the tab is visible. Consumers must treat each sample as
// (audioTime, ppqn) and fit their own clock; see parent.html's follower.
(() => {
  if (window.__colorNoiseTransport) return;
  const CHANNEL = 'colornoise:transport';
  const channel = new BroadcastChannel(CHANNEL);

  const engine = () => window.opendaw && window.opendaw.engine;
  const context = () => window.__colorNoiseTap && window.__colorNoiseTap.primary && window.__colorNoiseTap.primary.context;

  let last = { playing: null, ppqn: null };
  let sent = 0;

  const sample = () => {
    const e = engine();
    const ctx = context();
    if (!e || !ctx) return;
    let playing, ppqn;
    try { playing = !!e.isPlaying(); ppqn = e.position(); } catch { return; }
    if (playing === last.playing && ppqn === last.ppqn) return;
    last = { playing, ppqn };
    sent++;
    channel.postMessage({
      type: 'state',
      playing,
      ppqn,
      audioTime: ctx.currentTime,
      perfTime: performance.now(),
      sampleRate: ctx.sampleRate,
      baseLatency: ctx.baseLatency,
      outputLatency: ctx.outputLatency,
    });
  };

  // rAF for the common case, plus a timer so a change is never missed between frames.
  const loop = () => { sample(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  setInterval(sample, 4);

  channel.addEventListener('message', ({ data }) => {
    const e = engine();
    if (!e || !data) return;
    if (data.type === 'play') { try { e.play(); } catch (err) { console.warn('[colornoise-transport] play failed', err); } }
    if (data.type === 'stop') { try { e.stop(); } catch (err) { console.warn('[colornoise-transport] stop failed', err); } }
    if (data.type === 'ping') channel.postMessage({ type: 'pong', id: data.id, perfTime: performance.now() });
  });

  window.__colorNoiseTransport = Object.freeze({ version: 1, channel: CHANNEL, get sent() { return sent; } });
  channel.postMessage({ type: 'hello', perfTime: performance.now() });
  console.debug('[colornoise-transport] installed');
})();
