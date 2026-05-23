/**
 * SoundManager — Web Audio API-based sound effects.
 * Sounds are generated procedurally (no asset files).
 * Mute state persists via localStorage.
 */
const STORAGE_KEY = 'darts.sound'

export class SoundManager {
  constructor() {
    this._ctx = null
    this._enabled = localStorage.getItem(STORAGE_KEY) !== 'off'
    this._listeners = []
  }

  /** Lazy-init the AudioContext — browsers require a user gesture first. */
  _ensureContext() {
    if (!this._ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      this._ctx = new Ctx()
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume()
    }
    return this._ctx
  }

  /**
   * Dart hit ("thunk") — short percussive sound:
   *   noise burst + low oscillator with fast exponential decay.
   */
  playDartHit() {
    if (!this._enabled) return
    const ctx = this._ensureContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Low-frequency oscillator — body of the thunk
    const osc = ctx.createOscillator()
    osc.frequency.value = 140
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12)
    osc.type = 'sine'

    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.45
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(oscGain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.18)

    // Short noise burst — wood-impact attack
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    }
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 1200

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.25
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)
    noiseSrc.start(now)
  }

  /**
   * Turn change chime — two-note ascending arpeggio (C5 → E5).
   */
  playTurnChange() {
    if (!this._enabled) return
    const ctx = this._ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25]   // C5, E5

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.08
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      osc.type = 'triangle'

      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)

      osc.connect(gain).connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.35)
    })
  }

  /** Toggle mute state and notify listeners. */
  toggle() {
    this._enabled = !this._enabled
    localStorage.setItem(STORAGE_KEY, this._enabled ? 'on' : 'off')
    for (const fn of this._listeners) fn(this._enabled)
    return this._enabled
  }

  isEnabled() {
    return this._enabled
  }

  /** Register a callback called when mute state changes. */
  onChange(fn) {
    this._listeners.push(fn)
  }
}
