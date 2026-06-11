// Tiny Web Audio synth for algorithm feedback blips. No asset files, no React.
// A single shared AudioContext, lazily created on first (user-gesture-driven) play.

let ctx = null
let muted = false
const listeners = new Set()

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  return muted
}

export function toggleMuted() {
  muted = !muted
  if (!muted) ensureCtx() // unlock audio on the unmute gesture
  listeners.forEach((l) => l())
  return muted
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Map a 0..1 ratio onto a pleasant exponential pitch range (Hz).
export function noteFromRatio(r, lo = 220, hi = 880) {
  const c = Math.max(0, Math.min(1, r || 0))
  return lo * Math.pow(hi / lo, c)
}

// Short percussive tone. gain kept low so rapid blips don't fatigue.
export function blip(freq = 440, { duration = 0.05, type = 'triangle', gain = 0.04 } = {}) {
  if (muted) return
  const ac = ensureCtx()
  if (!ac) return
  try {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(g)
    g.connect(ac.destination)
    const now = ac.currentTime
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // audio is best-effort; never let it break the visualiser
  }
}
