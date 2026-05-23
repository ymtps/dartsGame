/**
 * Dart board hit detection using polar coordinates.
 * All calculations are pure math — no Three.js dependency.
 *
 * Board coordinate system:
 *   - Origin (0, 0) = board center
 *   - Positive Y = top (12 o'clock)
 *   - Positive X = right (3 o'clock)
 *   - x, y must be in the same unit space as boardRadius
 */

// Standard BDO/WDF dartboard number layout (12 o'clock = 20, clockwise)
export const SECTOR_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

// Normalized ring boundaries (radius / BOARD_RADIUS)
export const RING = {
  DOUBLE_BULL_OUTER: 0.0374,   // inner bull (double bull): r < 0.0374
  SINGLE_BULL_OUTER: 0.0935,   // outer bull (single bull): r < 0.0935
  INNER_SINGLE_OUTER: 0.5824,  // inner single: r < 0.5824
  TRIPLE_OUTER: 0.6294,        // triple ring: r < 0.6294
  OUTER_SINGLE_OUTER: 0.9529,  // outer single: r < 0.9529
  DOUBLE_OUTER: 1.0,           // double ring: r < 1.0 (board edge)
}

const TWO_PI = 2 * Math.PI
const SECTOR_ANGLE = TWO_PI / 20   // 18° per sector
const HALF_SECTOR = SECTOR_ANGLE / 2

/**
 * Returns scoring info for a landing position.
 * @param {number} x - X coordinate in board-local space
 * @param {number} y - Y coordinate in board-local space
 * @param {number} boardRadius - Board radius in the same units as x, y
 * @returns {{ number: number, multiplier: number, points: number, region: string }}
 */
export function getScoreAt(x, y, boardRadius) {
  const r = Math.sqrt(x * x + y * y) / boardRadius

  // Miss (outside board)
  if (r >= RING.DOUBLE_OUTER) {
    return { number: 0, multiplier: 0, points: 0, region: 'miss' }
  }

  // Bull zones
  if (r < RING.DOUBLE_BULL_OUTER) {
    return { number: 25, multiplier: 2, points: 50, region: 'double_bull' }
  }
  if (r < RING.SINGLE_BULL_OUTER) {
    return { number: 25, multiplier: 1, points: 25, region: 'single_bull' }
  }

  // Determine sector (number)
  // atan2(x, y) gives clockwise angle from 12 o'clock position
  const rawAngle = Math.atan2(x, y)
  const normalizedAngle = ((rawAngle + HALF_SECTOR) % TWO_PI + TWO_PI) % TWO_PI
  const sectorIndex = Math.floor(normalizedAngle / SECTOR_ANGLE) % 20
  const number = SECTOR_NUMBERS[sectorIndex]

  // Determine ring (multiplier)
  if (r < RING.INNER_SINGLE_OUTER) {
    return { number, multiplier: 1, points: number, region: 'single' }
  }
  if (r < RING.TRIPLE_OUTER) {
    return { number, multiplier: 3, points: number * 3, region: 'triple' }
  }
  if (r < RING.OUTER_SINGLE_OUTER) {
    return { number, multiplier: 1, points: number, region: 'single' }
  }
  // Double ring (r < DOUBLE_OUTER already checked)
  return { number, multiplier: 2, points: number * 2, region: 'double' }
}

/**
 * Returns the center position of a sector in board-local coordinates.
 * Useful for CPU AI targeting.
 * @param {number} number - Dart board number (1-20)
 * @param {'single'|'double'|'triple'|'single_bull'|'double_bull'} region
 * @param {number} boardRadius
 * @returns {{ x: number, y: number }}
 */
export function getSectorCenter(number, region, boardRadius) {
  if (number === 25) {
    const r = region === 'double_bull'
      ? (RING.DOUBLE_BULL_OUTER / 2) * boardRadius
      : ((RING.DOUBLE_BULL_OUTER + RING.SINGLE_BULL_OUTER) / 2) * boardRadius
    return { x: 0, y: r }
  }

  const idx = SECTOR_NUMBERS.indexOf(number)
  if (idx === -1) return { x: 0, y: 0 }

  // Center angle for this sector (clockwise from top)
  const centerAngle = idx * SECTOR_ANGLE

  let r
  switch (region) {
    case 'triple':
      r = ((RING.INNER_SINGLE_OUTER + RING.TRIPLE_OUTER) / 2) * boardRadius
      break
    case 'double':
      r = ((RING.OUTER_SINGLE_OUTER + RING.DOUBLE_OUTER) / 2) * boardRadius
      break
    default:
      r = ((RING.SINGLE_BULL_OUTER + RING.INNER_SINGLE_OUTER) / 2) * boardRadius
  }

  // Convert back: angle clockwise from top → (x, y)
  // x = r * sin(angle), y = r * cos(angle)
  return {
    x: r * Math.sin(centerAngle),
    y: r * Math.cos(centerAngle),
  }
}
