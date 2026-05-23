/**
 * SoundToggle — always-visible button that toggles sound on/off.
 * Positioned top-right, persists across all game states.
 */
export class SoundToggle {
  constructor(uiRoot, soundManager) {
    this.uiRoot = uiRoot
    this.sound = soundManager
    this._build()
    soundManager.onChange(() => this._refreshLabel())
  }

  _build() {
    this.button = document.createElement('button')
    Object.assign(this.button.style, {
      position: 'absolute',
      bottom: '12px',
      right: '12px',
      width: '44px',
      height: '44px',
      padding: '0',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '1.2rem',
      pointerEvents: 'auto',
      zIndex: '20',
      transition: 'background 0.15s',
    })
    this._refreshLabel()

    this.button.addEventListener('mouseover', () => {
      this.button.style.background = 'rgba(255,255,255,0.2)'
    })
    this.button.addEventListener('mouseout', () => {
      this.button.style.background = 'rgba(255,255,255,0.1)'
    })
    this.button.addEventListener('click', (e) => {
      e.stopPropagation()  // don't trigger throw via document click
      this.sound.toggle()
    })

    this.uiRoot.append(this.button)
  }

  _refreshLabel() {
    const enabled = this.sound.isEnabled()
    this.button.textContent = enabled ? '🔊' : '🔇'
    this.button.title = enabled ? '効果音 ON（クリックで OFF）' : '効果音 OFF（クリックで ON）'
  }
}
