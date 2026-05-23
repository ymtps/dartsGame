import * as THREE from 'three'
import { getSectorCenter, SECTOR_NUMBERS } from '../utils/PolarGeometry.js'
import { BOARD_RADIUS } from '../scene/Board.js'
import { CRICKET_NUMBERS } from './types.js'
import { applyDeviation } from './Ballistics.js'

// Max deviation by difficulty (fraction of BOARD_RADIUS)
const DIFFICULTY_DEVIATION = {
  easy:   BOARD_RADIUS * 0.30,
  medium: BOARD_RADIUS * 0.15,
  hard:   BOARD_RADIUS * 0.06,
}

const THINKING_DELAY_MS = 800
const BETWEEN_THROWS_MS = 500

export class CPU {
  /**
   * @param {string} difficulty - 'easy' | 'medium' | 'hard'
   * @param {function} [rng] - random source (default: Math.random)
   */
  constructor(difficulty = 'medium', rng = Math.random) {
    this.difficulty = difficulty
    this.rng = rng
    this._cancelled = false
    this._timers = []
  }

  /**
   * Choose a target sector (number + region) given mode and state.
   * @returns {{ number: number, region: string }}
   */
  selectTarget(mode, gameState) {
    if (mode === '501' || mode === '301') {
      return this._select501Target(gameState)
    }
    return this._selectCricketTarget(gameState)
  }

  _select501Target(gameState) {
    // gameState should expose cpuScore (remaining points)
    const remaining = gameState.cpuScore ?? 100

    // Endgame: < 50 → aim for exact checkout where possible
    if (remaining <= 20) {
      // Aim for the exact single needed
      return { number: remaining, region: 'single' }
    }
    if (remaining <= 40 && remaining % 2 === 0) {
      // Even, try the double
      return { number: remaining / 2, region: 'double' }
    }
    if (remaining <= 50) {
      // Try single-bull (25) or related setup
      return { number: 25, region: 'single_bull' }
    }
    // Default: triple 20
    return { number: 20, region: 'triple' }
  }

  _selectCricketTarget(gameState) {
    const { cricketState } = gameState
    if (!cricketState) return { number: 20, region: 'triple' }

    const myState = cricketState.cpu
    const oppState = cricketState.player

    const unclosed = CRICKET_NUMBERS.filter((n) => (myState[n] ?? 0) < 3)
    if (unclosed.length === 0) {
      // Everything closed — just throw at 20 triple (shouldn't happen in normal flow)
      return { number: 20, region: 'triple' }
    }

    if (this.difficulty === 'easy') {
      // Random unclosed target
      const idx = Math.floor(this.rng() * unclosed.length)
      const n = unclosed[idx]
      return { number: n, region: n === 25 ? 'single_bull' : 'triple' }
    }

    if (this.difficulty === 'medium') {
      // Highest unclosed number first (20 → 19 → ... → 15 → Bull)
      const ordered = [20, 19, 18, 17, 16, 15, 25]
      const target = ordered.find((n) => unclosed.includes(n))
      return { number: target, region: target === 25 ? 'single_bull' : 'triple' }
    }

    // Hard: prioritize closing what opponent is scoring on; else maximize own score
    const opponentScoring = unclosed.filter((n) => (oppState[n] ?? 0) >= 3)
    if (opponentScoring.length > 0) {
      // Close highest-value number opponent is scoring on
      const target = Math.max(...opponentScoring.filter((n) => n !== 25))
      const t = target || 25
      return { number: t, region: t === 25 ? 'single_bull' : 'triple' }
    }
    // Else: target highest unclosed
    const ordered = [20, 19, 18, 17, 16, 15, 25]
    const target = ordered.find((n) => unclosed.includes(n))
    return { number: target, region: target === 25 ? 'single_bull' : 'triple' }
  }

  /**
   * Simulate a throw to the given target (with difficulty-based scatter).
   * @returns {THREE.Vector3} landing point on board surface
   */
  simulateThrow(target) {
    const center = getSectorCenter(target.number, target.region, BOARD_RADIUS)
    const aimPoint = new THREE.Vector3(center.x, center.y, 0)
    const maxDev = DIFFICULTY_DEVIATION[this.difficulty] ?? DIFFICULTY_DEVIATION.medium

    // Bar offset analog: 0 = perfect, ±1 = max scatter
    // For CPU we use a random offset weighted toward 0 for higher difficulty
    const offset = (this.rng() - 0.5) * 2  // [-1, 1]
    return applyDeviation(aimPoint, offset, maxDev, this.rng)
  }

  /**
   * Execute a full CPU turn (3 throws).
   * @param {{ mode, gameState, onThrow, onAllDone }} opts
   * @param onThrow - called with (landingPoint, dartIndex) for each throw
   * @param onAllDone - called when all 3 throws complete (or fewer if cancelled)
   */
  executeTurn({ mode, getState, onThrow, onAllDone }) {
    this._cancelled = false
    this._timers = []

    let dartIndex = 0
    const doThrow = () => {
      if (this._cancelled) return

      const target = this.selectTarget(mode, getState())
      const landing = this.simulateThrow(target)
      onThrow(landing, dartIndex, () => {
        // onLanded callback from caller
        dartIndex++
        if (dartIndex >= 3 || this._cancelled) {
          onAllDone?.()
          return
        }
        const t = setTimeout(doThrow, BETWEEN_THROWS_MS)
        this._timers.push(t)
      })
    }

    // Initial thinking delay
    const t = setTimeout(doThrow, THINKING_DELAY_MS)
    this._timers.push(t)
  }

  /** Cancel any in-flight CPU turn (called on reset) */
  cancel() {
    this._cancelled = true
    for (const t of this._timers) clearTimeout(t)
    this._timers = []
  }
}
