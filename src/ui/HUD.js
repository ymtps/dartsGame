import { CRICKET_NUMBERS } from '../game/types.js'

/**
 * HUD — in-game score display overlay.
 *
 * All HUD containers have pointer-events: none so mouse events pass through
 * to the Three.js canvas for raycasting. Only the reset button has pointer-events: auto.
 *
 * Layout zones:
 *   - Top-left:   player score / cricket state
 *   - Top-right:  CPU score / cricket state
 *   - Top-center: turn indicator + dart count
 *   - Bottom:     PrecisionBar (owned by ThrowMechanic/PrecisionBar.js)
 *   - Right:      Reset button (pointer-events: auto)
 */
export class HUD {
  constructor(uiRoot) {
    this.uiRoot = uiRoot
    this._mode = null
    this._onReset = null
    this._bustFlashTimeout = null

    this._build()
  }

  _build() {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: 0,
      display: 'none',
      pointerEvents: 'none',
    })

    // Player panel (top-left)
    this.playerPanel = this._buildScorePanel('あなた', 'left', '0', '8px')

    // CPU panel (top-right)
    this.cpuPanel = this._buildScorePanel('CPU', 'right', '0', '8px')

    // Center info (turn + dart count)
    this.centerInfo = document.createElement('div')
    Object.assign(this.centerInfo.style, {
      position: 'absolute',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      color: '#fff',
      pointerEvents: 'none',
    })
    this.turnLabel = document.createElement('div')
    Object.assign(this.turnLabel.style, { fontSize: '0.85rem', opacity: '0.75', marginBottom: '4px' })
    this.dartDots = document.createElement('div')
    Object.assign(this.dartDots.style, { fontSize: '1.2rem', letterSpacing: '4px' })
    this.centerInfo.append(this.turnLabel, this.dartDots)

    // Dart scores for current turn (center, below turn label)
    this.dartScoreRow = document.createElement('div')
    Object.assign(this.dartScoreRow.style, {
      position: 'absolute',
      top: '70px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      color: '#fff',
      pointerEvents: 'none',
    })

    // Bust flash
    this.bustFlash = document.createElement('div')
    Object.assign(this.bustFlash.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '3rem',
      fontWeight: 'bold',
      color: '#ff4444',
      textShadow: '0 0 20px rgba(255,68,68,0.8)',
      display: 'none',
      pointerEvents: 'none',
    })
    this.bustFlash.textContent = 'BUST!'

    // Reset button (pointer-events: auto — user must be able to click it)
    const resetBtn = document.createElement('button')
    resetBtn.textContent = '⟳ リセット'
    Object.assign(resetBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '8px 16px',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      pointerEvents: 'auto',
    })
    resetBtn.addEventListener('click', () => this._onReset?.())

    // Cricket state table
    this.cricketTable = document.createElement('div')
    Object.assign(this.cricketTable.style, {
      position: 'absolute',
      top: '50%',
      left: '8px',
      transform: 'translateY(-50%)',
      color: '#fff',
      fontSize: '0.85rem',
      lineHeight: '1.8',
      display: 'none',
      pointerEvents: 'none',
    })

    this.container.append(
      this.playerPanel.container,
      this.cpuPanel.container,
      this.centerInfo,
      this.dartScoreRow,
      this.bustFlash,
      resetBtn,
      this.cricketTable,
    )
    this.uiRoot.append(this.container)
  }

  _buildScorePanel(name, side, top, fromEdge) {
    const container = document.createElement('div')
    Object.assign(container.style, {
      position: 'absolute',
      top,
      [side]: fromEdge,
      padding: '12px 16px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '6px',
      color: '#fff',
      minWidth: '120px',
      pointerEvents: 'none',
    })

    const label = document.createElement('div')
    label.textContent = name
    Object.assign(label.style, { fontSize: '0.75rem', opacity: '0.6', marginBottom: '4px' })

    const score = document.createElement('div')
    score.textContent = '0'
    Object.assign(score.style, { fontSize: '2rem', fontWeight: 'bold' })

    container.append(label, score)
    return { container, score }
  }

  show(mode, onReset) {
    this._mode = mode
    this._onReset = onReset
    this.container.style.display = 'block'
    this.cricketTable.style.display = mode === 'cricket' ? 'block' : 'none'
  }

  hide() {
    this.container.style.display = 'none'
  }

  /**
   * @param {import('../game/types.js').GameData} data
   */
  update(data) {
    const { mode, currentTurn, dartsThrown, dartScores = [], playerScore, cpuScore, cricketState } = data

    // Turn indicator
    this.turnLabel.textContent = currentTurn === 'player' ? 'あなたのターン' : 'CPU のターン'
    this.turnLabel.style.color = currentTurn === 'player' ? '#88ff88' : '#ff8888'

    // Dart dots (● remaining, ○ thrown)
    const dots = Array.from({ length: 3 }, (_, i) => i < dartsThrown ? '●' : '○').join(' ')
    this.dartDots.textContent = dots

    // Dart score row
    this.dartScoreRow.innerHTML = ''
    for (let i = 0; i < 3; i++) {
      const box = document.createElement('div')
      Object.assign(box.style, {
        padding: '4px 10px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px',
        minWidth: '36px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#fff',
      })
      box.textContent = dartScores[i]?.label ?? '—'
      this.dartScoreRow.append(box)
    }

    // Scores
    if (mode === 'cricket') {
      this.playerPanel.score.textContent = String(playerScore)
      this.cpuPanel.score.textContent = String(cpuScore)
      if (cricketState) this._updateCricketTable(cricketState)
    } else {
      this.playerPanel.score.textContent = String(playerScore)
      this.cpuPanel.score.textContent = String(cpuScore)
    }
  }

  _updateCricketTable(cricketState) {
    const marks = (n) => {
      const makeMarks = (count) => {
        if (count >= 3) return '◉'
        if (count === 2) return '◎'
        if (count === 1) return '○'
        return '·'
      }
      return makeMarks(n)
    }

    const rows = CRICKET_NUMBERS.map((n) => {
      const pCount = cricketState.player[n] ?? 0
      const cCount = cricketState.cpu[n] ?? 0
      const label = n === 25 ? 'Bull' : String(n)
      return `${marks(pCount)} ${label} ${marks(cCount)}`
    })

    this.cricketTable.innerHTML = `
      <div style="text-align:center;font-size:0.7rem;opacity:0.6;margin-bottom:4px">あなた / CPU</div>
      ${rows.map((r) => `<div style="font-family:monospace">${r}</div>`).join('')}
    `
  }

  /** Flash BUST! for 800ms, then call callback */
  showBust(callback) {
    clearTimeout(this._bustFlashTimeout)
    this.bustFlash.style.display = 'block'
    this.bustFlash.style.animation = 'none'
    this.bustFlash.style.opacity = '1'
    this._bustFlashTimeout = setTimeout(() => {
      this.bustFlash.style.display = 'none'
      callback?.()
    }, 800)
  }
}
