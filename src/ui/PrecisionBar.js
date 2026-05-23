/**
 * PrecisionBar — oscillating accuracy indicator.
 *
 * Rendered as a display-only HTML overlay (pointer-events: none).
 * Throw is triggered by a document-level click in ThrowMechanic,
 * NOT by clicking the bar itself, so the canvas receives all pointer events.
 */
export class PrecisionBar {
  constructor(uiRoot) {
    this.uiRoot = uiRoot
    this._offset = 0              // current position [-1, 1]
    this._speed = Math.PI * 2.0   // radians/second → full cycle ≈ 1.0s
    this._startTime = null
    this._rafId = null
    this._freezeTimer = null
    this._visible = false

    this._build()
  }

  _build() {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '48px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(320px, 88vw)',
      height: '48px',
      background: 'rgba(0,0,0,0.7)',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      display: 'none',
      alignItems: 'center',
      pointerEvents: 'none',   // display-only — clicks pass through to canvas
      userSelect: 'none',
    })

    // Track (background)
    const track = document.createElement('div')
    Object.assign(track.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    })

    // Zone indicator: tight green center, red edges (visual cue for difficulty)
    const zone = document.createElement('div')
    Object.assign(zone.style, {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to right, #cc2222, #ddaa22 35%, #22aa22 47%, #22aa22 53%, #ddaa22 65%, #cc2222)',
      opacity: '0.4',
    })

    // Center line
    const centerLine = document.createElement('div')
    Object.assign(centerLine.style, {
      position: 'absolute',
      top: 0,
      left: '50%',
      width: '2px',
      height: '100%',
      background: 'rgba(255,255,255,0.4)',
      transform: 'translateX(-50%)',
    })

    // Indicator bar
    this.indicator = document.createElement('div')
    Object.assign(this.indicator.style, {
      position: 'absolute',
      top: '4px',
      bottom: '4px',
      width: '6px',
      background: '#ffffff',
      borderRadius: '3px',
      left: '50%',
      transform: 'translateX(-50%)',
      transition: 'none',
      boxShadow: '0 0 8px rgba(255,255,255,0.8)',
    })

    // Label
    const label = document.createElement('div')
    Object.assign(label.style, {
      position: 'absolute',
      top: '-22px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255,255,255,0.7)',
      fontSize: '12px',
      whiteSpace: 'nowrap',
    })
    label.textContent = 'クリックして投げる'

    track.append(zone, centerLine, this.indicator, label)
    this.container.append(track)
    this.uiRoot.append(this.container)
  }

  /** Start oscillation — called when player's turn begins */
  start() {
    this._startTime = performance.now()
    this._visible = true
    this.container.style.display = 'flex'
    this._animate()
  }

  /** Stop oscillation — called when player's turn ends */
  stop() {
    this._visible = false
    this.container.style.display = 'none'
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    if (this._freezeTimer !== null) {
      clearTimeout(this._freezeTimer)
      this._freezeTimer = null
    }
  }

  /**
   * Freeze the bar at its current position and hide after a delay.
   * Used after throwing so the player can see where they clicked.
   */
  freeze(duration = 700) {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this._freezeTimer = setTimeout(() => {
      this._freezeTimer = null
      this.stop()
    }, duration)
  }

  _animate() {
    if (!this._visible) return

    const elapsed = (performance.now() - this._startTime) / 1000  // seconds
    this._offset = Math.sin(elapsed * this._speed)

    // Map [-1, 1] to pixel position (center = 50%)
    const pct = (this._offset + 1) / 2  // [0, 1]
    this.indicator.style.left = `${pct * 100}%`

    // Color the indicator: white (center) → red (edge)
    const urgency = Math.abs(this._offset)
    const r = Math.round(255 * urgency)
    const g = Math.round(255 * (1 - urgency))
    this.indicator.style.background = `rgb(${r},${g},80)`
    this.indicator.style.boxShadow = `0 0 8px rgb(${r},${g},80)`

    this._rafId = requestAnimationFrame(() => this._animate())
  }

  /** @returns {number} current bar position in [-1, 1]; 0 = center (best) */
  getOffset() {
    return this._offset
  }
}
