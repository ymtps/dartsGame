/**
 * 501/301 rules engine.
 * Casual rules: finish on any segment (no double required).
 * Bust: if score would go below 0, the entire turn is void and score is restored.
 */
export class Game501 {
  constructor(startScore) {
    this.startScore = startScore
    this.playerScore = startScore
    this.cpuScore = startScore

    // Snapshot taken at the start of each turn for bust rollback
    this._turnStartScores = { player: startScore, cpu: startScore }
    // Accumulated turn scores for rollback
    this._turnPoints = { player: 0, cpu: 0 }
  }

  /** Begin a new turn for the given side — snapshot current score */
  beginTurn(side) {
    this._turnStartScores[side] = this._getScore(side)
    this._turnPoints[side] = 0
  }

  _getScore(side) {
    return side === 'player' ? this.playerScore : this.cpuScore
  }

  _setScore(side, value) {
    if (side === 'player') this.playerScore = value
    else this.cpuScore = value
  }

  /**
   * Apply a single dart's score.
   * @returns {{ bust: boolean, won: boolean, newScore: number }}
   */
  applyThrow(side, scoreInfo) {
    const { points } = scoreInfo
    const current = this._getScore(side)
    const next = current - points

    if (next < 0) {
      // Bust — restore entire turn
      this._setScore(side, this._turnStartScores[side])
      this._turnPoints[side] = 0
      return { bust: true, won: false, newScore: this._turnStartScores[side] }
    }

    this._setScore(side, next)
    this._turnPoints[side] += points

    if (next === 0) {
      return { bust: false, won: true, newScore: 0 }
    }

    return { bust: false, won: false, newScore: next }
  }

  checkWin(side) {
    return this._getScore(side) === 0
  }

  getState() {
    return {
      playerScore: this.playerScore,
      cpuScore: this.cpuScore,
    }
  }
}
