// Color & Noise live tap for openDAW (Spike A).
//
// Injected into openDAW's <head> BEFORE its module script. It never touches
// openDAW's code: it wraps the Web Audio API so that any node connected to a
// context's speakers (AudioDestinationNode) is ALSO connected to a
// MediaStreamAudioDestinationNode. The resulting MediaStream is exposed on
// window.__colorNoiseTap so a same-origin parent frame can pull it into its
// own AudioContext for analysis.
//
// Routing-only, additive, same posture as the theme CSS injection (DECISIONS.md 65).
(() => {
  if (window.__colorNoiseTap) return;

  const taps = new WeakMap(); // AudioContext -> MediaStreamAudioDestinationNode
  const contexts = [];        // insertion order; [0] is the first context that reached the speakers
  const listeners = new Set();

  const tapFor = (context) => {
    let node = taps.get(context);
    if (node) return node;
    node = context.createMediaStreamDestination();
    taps.set(context, node);
    contexts.push(context);
    for (const fn of listeners) {
      try { fn(node.stream, context); } catch (e) { console.warn('[colornoise-tap] listener failed', e); }
    }
    window.dispatchEvent(new CustomEvent('colornoise:tap', { detail: { stream: node.stream, context } }));
    return node;
  };

  const isSpeakers = (target) => typeof AudioDestinationNode !== 'undefined' && target instanceof AudioDestinationNode;

  const nativeConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, output, input) {
    if (isSpeakers(target) && target.context === this.context) {
      const tap = tapFor(this.context);
      try {
        // Mirror the same output index into the tap. The tap has one input (index 0).
        nativeConnect.call(this, tap, output ?? 0, 0);
      } catch (e) {
        console.warn('[colornoise-tap] mirror connect failed', e);
      }
    }
    return nativeConnect.call(this, target, output, input);
  };

  const nativeDisconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect = function (...args) {
    const [target] = args;
    if (isSpeakers(target)) {
      const tap = taps.get(this.context);
      if (tap) {
        try { nativeDisconnect.call(this, tap); } catch { /* already gone */ }
      }
    }
    return nativeDisconnect.apply(this, args);
  };

  window.__colorNoiseTap = Object.freeze({
    version: 1,
    get primary() {
      const context = contexts[0];
      if (!context) return null;
      return { stream: taps.get(context).stream, context };
    },
    get all() {
      return contexts.map((context) => ({ stream: taps.get(context).stream, context }));
    },
    onTap(fn) {
      listeners.add(fn);
      for (const context of contexts) fn(taps.get(context).stream, context);
      return () => listeners.delete(fn);
    },
  });

  console.debug('[colornoise-tap] installed');
})();
