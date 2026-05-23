/**
 * Shared type contracts for game data.
 * Import from here to ensure HUD and game mode modules share the same shape.
 */

/**
 * Cricket state for a single player.
 * Keys are target numbers: 15, 16, 17, 18, 19, 20, 25 (Bull).
 * Values are hit counts (0-3). 3+ = closed.
 *
 * @typedef {{ [segment: number]: number }} PlayerCricketState
 *
 * @typedef {{
 *   player: PlayerCricketState,
 *   cpu: PlayerCricketState,
 * }} CricketState
 */

/** Cricket target numbers (standard) */
export const CRICKET_NUMBERS = [15, 16, 17, 18, 19, 20, 25]

/**
 * Creates a fresh cricket state (all zeros).
 * @returns {CricketState}
 */
export function createCricketState() {
  const init = () => Object.fromEntries(CRICKET_NUMBERS.map((n) => [n, 0]))
  return { player: init(), cpu: init() }
}

/**
 * Game data passed to HUD.update() on every meaningful change.
 *
 * @typedef {{
 *   mode: '501' | '301' | 'cricket',
 *   currentTurn: 'player' | 'cpu',
 *   dartsThrown: number,
 *   dartScores: Array<{ points: number, label: string }>,
 *   playerScore: number,
 *   cpuScore: number,
 *   cricketState: CricketState | null,
 * }} GameData
 */
