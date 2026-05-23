import * as THREE from 'three'

const DART_COLOR = 0x888888     // barrel (nickel/silver)
const TIP_COLOR = 0xcccccc      // tip (bright steel)
const FLIGHT_COLOR = 0x3366cc   // flight (blue plastic)
const SHAFT_COLOR = 0x333333    // shaft (dark)

export class DartMesh {
  constructor(scene, sceneManager) {
    this.scene = scene
    this.sceneManager = sceneManager
    this._removeFrameCallback = null
    this.isAnimating = false

    this.darts = []  // active darts stuck in board (max 3 per turn)
  }

  _buildDartGroup() {
    const group = new THREE.Group()

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.010, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: DART_COLOR, metalness: 0.8, roughness: 0.2 })
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = -0.04
    group.add(barrel)

    // Tip (cone pointing in +Z)
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.006, 0.04, 8),
      new THREE.MeshStandardMaterial({ color: TIP_COLOR, metalness: 0.9, roughness: 0.1 })
    )
    tip.rotation.x = -Math.PI / 2
    tip.position.z = 0.02
    group.add(tip)

    // Shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: SHAFT_COLOR })
    )
    shaft.rotation.x = Math.PI / 2
    shaft.position.z = -0.11
    group.add(shaft)

    // Flight (flat quad)
    const flight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: FLIGHT_COLOR, side: THREE.DoubleSide })
    )
    flight.position.z = -0.16
    group.add(flight)

    return group
  }

  /**
   * Animate a dart along a parabolic arc from startPos to endPos.
   * @param {THREE.Vector3} startPos - starting position in world space
   * @param {THREE.Vector3} endPos - landing position on the board
   * @param {number} duration - animation duration in ms
   * @param {function} onComplete - called with endPos when animation finishes
   */
  throwTo(startPos, endPos, duration = 600, onComplete) {
    if (this.isAnimating) return

    this.isAnimating = true
    const dart = this._buildDartGroup()
    this.scene.add(dart)

    const startTime = performance.now()
    const arcHeight = 0.25

    const update = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)

      // Parabolic arc
      dart.position.lerpVectors(startPos, endPos, t)
      dart.position.y += arcHeight * Math.sin(Math.PI * t)

      // Point toward the board
      dart.lookAt(endPos)
      dart.rotateX(Math.PI / 2)

      if (t >= 1) {
        // Snap to final position
        dart.position.copy(endPos)
        dart.position.z += 0.02  // tip slightly above board surface
        dart.lookAt(new THREE.Vector3(endPos.x, endPos.y, endPos.z - 1))
        dart.rotateX(Math.PI / 2)

        this.isAnimating = false
        this._removeFrameCallback?.()
        this._removeFrameCallback = null
        this.darts.push(dart)
        onComplete?.(endPos)
      }
    }

    this._removeFrameCallback = this.sceneManager.addFrameCallback(update)
  }

  /** Remove all darts from the board (called at turn end) */
  clearDarts() {
    for (const dart of this.darts) {
      this.scene.remove(dart)
      dart.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
    }
    this.darts = []
  }
}
