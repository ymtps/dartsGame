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
    const diffSection = this._buildSection('CPUの強さ', [
      { value: 'easy', label: '弱い' },
      { value: 'medium', label: '普通' },
      { value: 'hard', label: '強い' },
    ], 'difficulty')

    // Button row: How to Play + Start
    const btnRow = document.createElement('div')
    Object.assign(btnRow.style, {
      marginTop: '16px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    })

    const howToBtn = document.createElement('button')
    howToBtn.textContent = '遊び方'
    Object.assign(howToBtn.style, {
      padding: '14px 32px',
      fontSize: '1.1rem',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '2px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      cursor: 'pointer',
      letterSpacing: '2px',
    })
    howToBtn.addEventListener('mouseover', () => { howToBtn.style.background = 'rgba(255,255,255,0.2)' })
    howToBtn.addEventListener('mouseout', () => { howToBtn.style.background = 'rgba(255,255,255,0.1)' })
    howToBtn.addEventListener('click', () => this._showHowToPlay())

    const startBtn = document.createElement('button')
    startBtn.textContent = 'ゲーム開始'
    Object.assign(startBtn.style, {
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

    btnRow.append(howToBtn, startBtn)
    this.container.append(modeSection, diffSection, btnRow)
    this.uiRoot.append(this.container)

    this._buildHowToModal()

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

  _buildHowToModal() {
    this._modal = document.createElement('div')
    Object.assign(this._modal.style, {
      position: 'absolute',
      inset: 0,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      pointerEvents: 'auto',
      zIndex: 20,
      overflowY: 'auto',
      padding: '24px 16px',
    })

    const panel = document.createElement('div')
    Object.assign(panel.style, {
      maxWidth: '520px',
      width: '100%',
      background: 'rgba(30,30,50,0.98)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      padding: '28px 28px 24px',
      color: '#eee',
      fontSize: '0.88rem',
      lineHeight: '1.7',
    })

    panel.innerHTML = `
      <h2 style="font-size:1.4rem;margin-bottom:20px;letter-spacing:3px;text-align:center;">🎯 遊び方</h2>

      <h3 style="color:#aaf;margin:16px 0 8px;font-size:0.9rem;letter-spacing:1px;">── 投げ方（2クリック方式）</h3>
      <p style="margin-bottom:6px;"><span style="color:#fff;font-weight:bold;">1回目のクリック / タップ</span>　→　照準を固定</p>
      <p style="margin-bottom:6px; padding-left:12px; opacity:0.8;">白いサークルがふわふわ揺れています。タイミングよくクリックして狙いを定めましょう。</p>
      <p style="margin-bottom:6px;"><span style="color:#fff;font-weight:bold;">2回目のクリック / タップ</span>　→　ダーツを投げる</p>
      <p style="padding-left:12px; opacity:0.8;">画面下の<b>精度バー</b>が左右に動きます。中央（緑ゾーン）に近いほど狙い通りに飛びます。端（赤）で投げるとズレが大きくなります。</p>

      <h3 style="color:#aaf;margin:20px 0 8px;font-size:0.9rem;letter-spacing:1px;">── ゲームモード</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 10px 5px 0;font-weight:bold;white-space:nowrap;vertical-align:top;">501 / 301</td>
          <td style="padding:5px 0;opacity:0.85;">501点（または301点）から始めて、ちょうど0点にした方が勝ち。0点を下回る投げ方は<b>バースト</b>（そのターン無効）。</td>
        </tr>
        <tr>
          <td style="padding:5px 10px 5px 0;font-weight:bold;white-space:nowrap;vertical-align:top;">クリケット</td>
          <td style="padding:5px 0;opacity:0.85;">15〜20とブル（25）が対象。各エリアに<b>3回</b>当てると「クローズ」。クローズ後も相手が未クローズなら得点できる。全エリアをクローズし、かつ相手以上の得点で勝利。</td>
        </tr>
      </table>

      <h3 style="color:#aaf;margin:20px 0 8px;font-size:0.9rem;letter-spacing:1px;">── ボードの得点</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:3px 10px 3px 0;opacity:0.7;">シングル</td><td style="padding:3px 0;">数字そのまま（1〜20点）</td></tr>
        <tr><td style="padding:3px 10px 3px 0;opacity:0.7;">ダブルリング（外細帯）</td><td style="padding:3px 0;">数字 × 2</td></tr>
        <tr><td style="padding:3px 10px 3px 0;opacity:0.7;">トリプルリング（内細帯）</td><td style="padding:3px 0;">数字 × 3</td></tr>
        <tr><td style="padding:3px 10px 3px 0;opacity:0.7;">シングルブル（外ブル）</td><td style="padding:3px 0;">25点</td></tr>
        <tr><td style="padding:3px 10px 3px 0;opacity:0.7;">ダブルブル（内ブル）</td><td style="padding:3px 0;">50点</td></tr>
      </table>

      <p style="margin-top:16px;opacity:0.7;font-size:0.82rem;">1ターンにつき3投。プレイヤーとCPUが交互にプレイします。</p>
    `

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '閉じる'
    Object.assign(closeBtn.style, {
      display: 'block',
      margin: '20px auto 0',
      padding: '10px 40px',
      fontSize: '1rem',
      background: 'rgba(255,255,255,0.12)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '6px',
      cursor: 'pointer',
      letterSpacing: '2px',
    })
    closeBtn.addEventListener('mouseover', () => { closeBtn.style.background = 'rgba(255,255,255,0.22)' })
    closeBtn.addEventListener('mouseout', () => { closeBtn.style.background = 'rgba(255,255,255,0.12)' })
    closeBtn.addEventListener('click', () => { this._modal.style.display = 'none' })

    panel.append(closeBtn)
    this._modal.append(panel)
    this.uiRoot.append(this._modal)

    // Close on backdrop click
    this._modal.addEventListener('click', (e) => {
      if (e.target === this._modal) this._modal.style.display = 'none'
    })
  }

  _showHowToPlay() {
    this._modal.style.display = 'flex'
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
