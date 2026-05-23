import { CRICKET_NUMBERS, createCricketState } from '../types.js'

/**
 * Cricket rules engine.
 *
 * Targets: 15, 16, 17, 18, 19, 20, Bull (25)
 * - 3 hits to close a number
 * - Outer Bull (single bull, 25pts, 1 count) vs Inner Bull (double bull, 50pts, 2 counts)
 * - After closing: additional hits score points if opponent hasn't closed yet
 * - Win: all targets closed AND score >= opponent's score
 */
export class Cricket {
  constructor() {
    this.state = createCricketState()
    this.playerScore = 0
    this.cpuScore = 0
  }

  /**
   * Apply a single dart for the given side.
   * @param {'player'|'cpu'} side
   * @param {{ number: number, multiplier: number, points: number, region: string }} scoreInfo
   * @returns {{ counted: boolean, closed: boolean, scored: number }}
   */
  applyThrow(side, scoreInfo) {
    const { number, multiplier, points, region } = scoreInfo
    const opponent = side === 'player' ? 'cpu' : 'player'

    // Only target cricket numbers
    const target = region === 'double_bull' ? 25 : (region === 'single_bull' ? 25 : number)
    if (!CRICKET_NUMBERS.includes(target)) {
      return { counted: false, closed: false, scored: 0 }
    }

    // Determine hit counts for this throw
    // Inner Bull = 2 counts, everything else = multiplier counts
    const hitCounts = region === 'double_bull' ? 2 : multiplier
    // Face value per mark when scoring: Bull = 25, numbers = number
    const faceValue = target === 25 ? 25 : number

    const currentHits = this.state[side][target] ?? 0
    const newHits = currentHits + hitCounts

    let scored = 0
    let closed = false

    if (currentHits < 3) {
      // Still working toward close
      const clampedNew = Math.min(newHits, 3)
      this.state[side][target] = clampedNew

      // Any hits beyond the 3-count threshold score if opponent is open
      const excessCounts = Math.max(0, newHits - 3)
      if (excessCounts > 0 && (this.state[opponent][target] ?? 0) < 3) {
        scored = faceValue * excessCounts
        this._addScore(side, scored)
      }

      closed = clampedNew >= 3
    } else {
      // Already closed — score if opponent is open
      if ((this.state[opponent][target] ?? 0) < 3) {
        scored = faceValue * hitCounts
        this._addScore(side, scored)
      }
    }

    if (this.state[side][target] >= 3 && currentHits < 3) {
      closed = true
    }

    return { counted: true, closed, scored }
  }

  _addScore(side, points) {
    if (side === 'player') this.playerScore += points
    else this.cpuScore += points
  }

  /** Check win: all targets closed AND score >= opponent */
  checkWin(side) {
    const state = this.state[side]
    const allClosed = CRICKET_NUMBERS.every((n) => (state[n] ?? 0) >= 3)
    if (!allClosed) return false

    const myScore = side === 'player' ? this.playerScore : this.cpuScore
    const oppScore = side === 'player' ? this.cpuScore : this.playerScore
    return myScore >= oppScore
  }

  getState() {
    return {
      cricketState: { player: { ...this.state.player }, cpu: { ...this.state.cpu } },
      playerScore: this.playerScore,
      cpuScore: this.cpuScore,
    }
  }
}
