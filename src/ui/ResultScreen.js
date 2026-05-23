/**
 * ResultScreen — win/lose display with replay and mode-select buttons.
 */
export class ResultScreen {
  constructor(uiRoot) {
    this.uiRoot = uiRoot
    this._build()
  }

  _build() {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: 0,
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      pointerEvents: 'auto',
      color: '#fff',
      gap: '20px',
    })

    this.winnerEl = document.createElement('h2')
    Object.assign(this.winnerEl.style, { fontSize: '2rem', marginBottom: '4px' })

    this.statsEl = document.createElement('div')
    Object.assign(this.statsEl.style, {
      fontSize: '1rem',
      opacity: '0.75',
      textAlign: 'center',
      lineHeight: '1.8',
    })

    const btnRow = document.createElement('div')
    Object.assign(btnRow.style, { display: 'flex', gap: '16px', marginTop: '16px' })

    this._replayBtn = this._buildBtn('もう一度', '#22aa22', '#1a8a1a')
    this._menuBtn = this._buildBtn('モード選択へ', '#4444cc', '#3333aa')

    btnRow.append(this._replayBtn, this._menuBtn)
    this.container.append(this.winnerEl, this.statsEl, btnRow)
    this.uiRoot.append(this.container)
  }

  _buildBtn(text, bg, bgHover) {
    const btn = document.createElement('button')
    btn.textContent = text
    Object.assign(btn.style, {
      padding: '12px 32px',
      fontSize: '1rem',
      background: bg,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
    })
    btn.addEventListener('mouseover', () => { btn.style.background = bgHover })
    btn.addEventListener('mouseout', () => { btn.style.background = bg })
    return btn
  }

  /**
   * @param {'player'|'cpu'} winner
   * @param {{ mode: string, playerScore: number, cpuScore: number, rounds: number }} stats
   * @param {{ onReplay: function, onMenu: function }} callbacks
   */
  show(winner, stats, { onReplay, onMenu }) {
    this.winnerEl.textContent = winner === 'player' ? '🎉 あなたの勝ち！' : '🤖 CPUの勝ち'
    this.winnerEl.style.color = winner === 'player' ? '#ffcc00' : '#ff6666'

    const modeLabel = stats.mode === 'cricket' ? 'クリケット' : stats.mode
    this.statsEl.innerHTML = [
      `モード: ${modeLabel}`,
      `あなた: ${stats.playerScore} | CPU: ${stats.cpuScore}`,
      `ラウンド数: ${stats.rounds}`,
    ].join('<br>')

    this._replayBtn.onclick = () => {
      this.hide()
      onReplay?.()
    }
    this._menuBtn.onclick = () => {
      this.hide()
      onMenu?.()
    }

    this.container.style.display = 'flex'
  }

  hide() {
    this.container.style.display = 'none'
  }
}
