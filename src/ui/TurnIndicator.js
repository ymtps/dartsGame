/**
 * TurnIndicator — centered overlay shown before each turn handoff.
 * Fades in, holds, fades out, then calls callback.
 */
const HOLD_MS = 1000
const FADE_MS = 250

export class TurnIndicator {
  constructor(uiRoot, soundManager = null) {
    this.uiRoot = uiRoot
    this.sound = soundManager
    this._activeTimers = []
    this._build()
  }

  _build() {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '32px 80px',
      background: 'rgba(0,0,0,0.75)',
      border: '2px solid rgba(255,255,255,0.4)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '2.4rem',
      fontWeight: 'bold',
      letterSpacing: '4px',
      pointerEvents: 'none',
      opacity: '0',
      display: 'none',
      transition: `opacity ${FADE_MS}ms ease`,
      textShadow: '0 0 20px rgba(255,255,255,0.5)',
      whiteSpace: 'nowrap',
    })
    this.uiRoot.append(this.container)
  }

  /**
   * Show the indicator for the given turn, then invoke callback.
   * @param {'player'|'cpu'} turn
   * @param {function} callback - called after fade-out
   */
  show(turn, callback) {
    this._clearTimers()

    const isPlayer = turn === 'player'
    this.container.textContent = isPlayer ? 'あなたのターン' : 'CPU のターン'
    this.container.style.color = isPlayer ? '#88ff88' : '#ff8888'
    this.container.style.borderColor = isPlayer ? 'rgba(136,255,136,0.6)' : 'rgba(255,136,136,0.6)'

    this.container.style.display = 'block'
    this.container.style.opacity = '0'

    // Play chime alongside the visual
    this.sound?.playTurnChange()

    // Fade in (use a microtask so the browser registers the initial opacity:0)
    requestAnimationFrame(() => {
      this.container.style.opacity = '1'
    })

    // Hold, then fade out
    this._activeTimers.push(setTimeout(() => {
      this.container.style.opacity = '0'
    }, HOLD_MS + FADE_MS))

    // Hide after fade out completes, then callback
    this._activeTimers.push(setTimeout(() => {
      this.container.style.display = 'none'
      callback?.()
    }, HOLD_MS + FADE_MS * 2))
  }

  /** Cancel any in-flight indicator (called on reset) */
  cancel() {
    this._clearTimers()
    this.container.style.display = 'none'
    this.container.style.opacity = '0'
  }

  _clearTimers() {
    for (const t of this._activeTimers) clearTimeout(t)
    this._activeTimers = []
  }
}
