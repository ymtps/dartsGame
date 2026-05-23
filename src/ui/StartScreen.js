/**
 * StartScreen — game mode and difficulty selection overlay.
 * pointer-events: auto on the container (user must interact with buttons).
 */
export class StartScreen {
  constructor(uiRoot) {
    this.uiRoot = uiRoot
    this._onStart = null
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
      background: 'rgba(0,0,0,0.85)',
      pointerEvents: 'auto',
      color: '#fff',
      gap: '24px',
    })

    // Title
    const title = document.createElement('h1')
    title.textContent = '🎯 3D ダーツ'
    Object.assign(title.style, { fontSize: '2.5rem', marginBottom: '8px', letterSpacing: '4px' })
    this.container.append(title)

    // Mode section
    const modeSection = this._buildSection('ゲームモード', [
      { value: '501', label: '501' },
      { value: '301', label: '301' },
      { value: 'cricket', label: 'クリケット' },
    ], 'mode')

    // Difficulty section
    const diffSection = this._buildSection('難易度', [
      { value: 'easy', label: '簡単' },
      { value: 'medium', label: '普通' },
      { value: 'hard', label: '難しい' },
    ], 'difficulty')

    // Start button
    const startBtn = document.createElement('button')
    startBtn.textContent = 'ゲーム開始'
    Object.assign(startBtn.style, {
      marginTop: '16px',
      padding: '14px 48px',
      fontSize: '1.2rem',
      background: '#22aa22',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      letterSpacing: '2px',
    })
    startBtn.addEventListener('mouseover', () => { startBtn.style.background = '#1a8a1a' })
    startBtn.addEventListener('mouseout', () => { startBtn.style.background = '#22aa22' })
    startBtn.addEventListener('click', () => this._handleStart())

    this.container.append(modeSection, diffSection, startBtn)
    this.uiRoot.append(this.container)

    // Track selected values
    this._selected = { mode: '501', difficulty: 'medium' }
  }

  _buildSection(title, options, key) {
    const section = document.createElement('div')
    Object.assign(section.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    })

    const label = document.createElement('div')
    label.textContent = title
    Object.assign(label.style, { fontSize: '0.9rem', opacity: '0.7', letterSpacing: '2px' })

    const btnRow = document.createElement('div')
    Object.assign(btnRow.style, { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' })

    const defaultValue = key === 'mode' ? '501' : 'medium'
    const buttons = []

    for (const opt of options) {
      const btn = document.createElement('button')
      btn.textContent = opt.label
      btn.dataset.value = opt.value
      const isDefault = opt.value === defaultValue

      Object.assign(btn.style, {
        padding: '12px 24px',
        fontSize: '1rem',
        minHeight: '48px',
        background: isDefault ? '#4444cc' : 'rgba(255,255,255,0.15)',
        color: '#fff',
        border: `2px solid ${isDefault ? '#6666ff' : 'rgba(255,255,255,0.3)'}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      })

      btn.addEventListener('click', () => {
        this._selected[key] = opt.value
        buttons.forEach((b) => {
          const active = b.dataset.value === opt.value
          b.style.background = active ? '#4444cc' : 'rgba(255,255,255,0.15)'
          b.style.borderColor = active ? '#6666ff' : 'rgba(255,255,255,0.3)'
        })
      })

      buttons.push(btn)
      btnRow.append(btn)
    }

    section.append(label, btnRow)
    return section
  }

  _handleStart() {
    this.hide()
    this._onStart?.(this._selected.mode, this._selected.difficulty)
  }

  show(onStart) {
    this._onStart = onStart
    this.container.style.display = 'flex'
  }

  hide() {
    this.container.style.display = 'none'
  }
}
