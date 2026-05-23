export const STATE = Object.freeze({
  START_SCREEN:      'START_SCREEN',
  PLAYER_TURN:       'PLAYER_TURN',
  DART_FLYING:       'DART_FLYING',
  CPU_THINKING:      'CPU_THINKING',
  CPU_DART_FLYING:   'CPU_DART_FLYING',
  CONFIRM_RESET:     'CONFIRM_RESET',
  RESULT:            'RESULT',
})

export class GameState {
  constructor() {
    this.current = STATE.START_SCREEN
    this._previousBeforeReset = null

    // Game settings
    this.mode = null          // '501' | '301' | 'cricket'
    this.difficulty = null    // 'easy' | 'medium' | 'hard'

    // Turn state
    this.currentTurn = 'player'  // 'player' | 'cpu'
    this.dartsThrown = 0          // 0-3 per turn
    this.roundsPlayed = 0

    // Callbacks registered by external modules
    this._listeners = {}
  }

  /** Register a state change listener: fn(newState, prevState) */
  on(state, fn) {
    if (!this._listeners[state]) this._listeners[state] = []
    this._listeners[state].push(fn)
  }

  /** Remove all listeners for a state */
  off(state) {
    delete this._listeners[state]
  }

  transition(newState) {
    if (newState === this.current) return
    const prev = this.current
    this.current = newState

    const fns = this._listeners[newState] || []
    for (const fn of fns) fn(newState, prev)
  }

  /** Begin game with chosen settings */
  startGame({ mode, difficulty }) {
    this.mode = mode
    this.difficulty = difficulty
    this.currentTurn = 'player'
    this.dartsThrown = 0
    this.roundsPlayed = 0
    this._previousBeforeReset = null
    this.transition(STATE.PLAYER_TURN)
  }

  /** Called when a throw animation starts */
  onThrow() {
    if (this.current !== STATE.PLAYER_TURN) return
    this.transition(STATE.DART_FLYING)
  }

  /**
   * Called when a dart lands.
   * @param {{ endTurn: boolean }} opts - endTurn=true to skip to opponent regardless of dartsThrown
   */
  onLanded({ endTurn = false } = {}) {
    if (this.current !== STATE.DART_FLYING) return
    this.dartsThrown++

    if (endTurn || this.dartsThrown >= 3) {
      this.dartsThrown = 0
      this.roundsPlayed++
      this.currentTurn = 'cpu'
      this.transition(STATE.CPU_THINKING)
    } else {
      this.transition(STATE.PLAYER_TURN)
    }
  }

  /** CPU has finished thinking and is about to throw */
  onCpuThrow() {
    if (this.current !== STATE.CPU_THINKING) return
    this.transition(STATE.CPU_DART_FLYING)
  }

  /** Called when a CPU dart lands */
  onCpuLanded({ endTurn = false } = {}) {
    if (this.current !== STATE.CPU_DART_FLYING) return
    this.dartsThrown++

    if (endTurn || this.dartsThrown >= 3) {
      this.dartsThrown = 0
      this.currentTurn = 'player'
      this.transition(STATE.PLAYER_TURN)
    } else {
      this.transition(STATE.CPU_THINKING)
    }
  }

  /** Declare a winner and show result */
  declareWinner(winner, stats) {
    this._winner = winner
    this._resultStats = stats
    this.transition(STATE.RESULT)
  }

  get winner() { return this._winner }
  get resultStats() { return this._resultStats }

  /** Player requests mid-game reset */
  requestReset() {
    if (this.current === STATE.START_SCREEN || this.current === STATE.RESULT) return
    this._previousBeforeReset = this.current
    this.transition(STATE.CONFIRM_RESET)
  }

  /** Confirmed: go back to start */
  confirmReset() {
    this._previousBeforeReset = null
    this.mode = null
    this.difficulty = null
    this.dartsThrown = 0
    this.currentTurn = 'player'
    this.transition(STATE.START_SCREEN)
  }

  /** Cancelled: return to previous state */
  cancelReset() {
    const prev = this._previousBeforeReset || STATE.PLAYER_TURN
    this._previousBeforeReset = null
    this.transition(prev)
  }
}
