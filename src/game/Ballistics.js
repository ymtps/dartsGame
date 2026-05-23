import * as THREE from 'three'

/**
 * Computes a parabolic arc from startPos to endPos.
 * Returns an array of { position: THREE.Vector3, time: number } keyframes.
 *
 * @param {THREE.Vector3} from - throw origin (world space)
 * @param {THREE.Vector3} to - target landing point (world space)
 * @param {{ arcHeight?: number, steps?: number }} options
 * @returns {Array<{ position: THREE.Vector3, t: number }>}
 */
export function computeArc(from, to, options = {}) {
  const { arcHeight = 0.3, steps = 30 } = options

  const keyframes = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const pos = new THREE.Vector3().lerpVectors(from, to, t)
    pos.y += arcHeight * Math.sin(Math.PI * t)
    keyframes.push({ position: pos, t })
  }
  return keyframes
}

/**
 * Apply deviation to an aim point based on precision bar offset.
 * @param {THREE.Vector3} aimPoint - board-surface aim position
 * @param {number} barOffset - precision bar position [-1, 1]; 0 = center (perfect)
 * @param {number} maxDeviation - max deviation radius in world units
 * @param {function} [rng] - random number source (default: Math.random) for testability
 * @returns {THREE.Vector3} deviated landing point
 */
export function applyDeviation(aimPoint, barOffset, maxDeviation, rng = Math.random) {
  const magnitude = Math.abs(barOffset) * maxDeviation
  const angle = rng() * Math.PI * 2

  const deviated = aimPoint.clone()
  deviated.x += magnitude * Math.cos(angle)
  deviated.y += magnitude * Math.sin(angle)
  // Z stays the same (board surface)
  return deviated
}
