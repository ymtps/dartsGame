import * as THREE from 'three'

const BARREL_COLOR = 0x9da3aa
const BARREL_DARK = 0x4e555d
const TIP_COLOR = 0xd9dde1
const FLIGHT_COLOR = 0x1f6feb
const FLIGHT_ACCENT = 0xff3b30
const SHAFT_COLOR = 0x171a1f
const DART_SCALE = 1.35
const TIP_LOCAL_Z = 0.063 * DART_SCALE
const LOCAL_TIP_DIRECTION = new THREE.Vector3(0, 0, 1)
const BASE_STICK_DIRECTION = new THREE.Vector3(0.16, -0.1, -1).normalize()
const STICK_ANGLE_JITTER = 0.16

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, ...options })
}

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
    const metal = makeMaterial(BARREL_COLOR, { metalness: 0.9, roughness: 0.18 })
    const darkMetal = makeMaterial(BARREL_DARK, { metalness: 0.75, roughness: 0.28 })
    const tipMetal = makeMaterial(TIP_COLOR, { metalness: 1, roughness: 0.12 })
    const accent = makeMaterial(FLIGHT_ACCENT, { metalness: 0.45, roughness: 0.24 })
    const shaftMaterial = makeMaterial(SHAFT_COLOR, { metalness: 0.25, roughness: 0.38 })
    const flightMaterial = makeMaterial(FLIGHT_COLOR, {
      metalness: 0,
      roughness: 0.42,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
    const flightTrimMaterial = makeMaterial(FLIGHT_ACCENT, { side: THREE.DoubleSide })

    const addMesh = (geometry, material, { z = 0, rx = Math.PI / 2 } = {}) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = rx
      mesh.position.z = z
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
      return mesh
    }

    // Needle point and stepped nose.
    addMesh(new THREE.ConeGeometry(0.0045, 0.05, 24), tipMetal, { z: 0.038 })
    addMesh(new THREE.CylinderGeometry(0.0065, 0.009, 0.028, 24), darkMetal, { z: 0.002 })

    // Tapered barrel with a thicker center and grip rings.
    addMesh(new THREE.CylinderGeometry(0.012, 0.009, 0.028, 32), metal, { z: -0.024 })
    addMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.042, 32), metal, { z: -0.059 })
    addMesh(new THREE.CylinderGeometry(0.009, 0.012, 0.026, 32), metal, { z: -0.093 })

    for (const z of [-0.042, -0.052, -0.064, -0.076]) {
      addMesh(new THREE.TorusGeometry(0.0142, 0.0011, 8, 32), darkMetal, { z, rx: 0 })
    }

    for (const z of [-0.018, -0.101]) {
      addMesh(new THREE.TorusGeometry(0.0106, 0.0014, 8, 32), accent, { z, rx: 0 })
    }

    // Slim shaft and connector collar.
    addMesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.064, 18), shaftMaterial, { z: -0.137 })
    addMesh(new THREE.CylinderGeometry(0.007, 0.006, 0.014, 18), darkMetal, { z: -0.105 })

    const flightShape = new THREE.Shape()
    flightShape.moveTo(0, 0.032)
    flightShape.lineTo(0.034, 0.012)
    flightShape.lineTo(0.025, -0.031)
    flightShape.lineTo(0, -0.043)
    flightShape.lineTo(-0.025, -0.031)
    flightShape.lineTo(-0.034, 0.012)
    flightShape.closePath()

    const flightGeometry = new THREE.ShapeGeometry(flightShape)
    flightGeometry.rotateX(Math.PI / 2)

    const trimGeometry = new THREE.RingGeometry(0.004, 0.006, 24)
    trimGeometry.rotateX(Math.PI / 2)

    for (const [rotation, scale] of [[0, 1], [Math.PI / 2, 0.72]]) {
      const flight = new THREE.Mesh(flightGeometry, flightMaterial)
      flight.rotation.z = rotation
      flight.position.z = -0.185
      flight.scale.set(scale, scale, scale)
      flight.castShadow = true
      group.add(flight)

      const trim = new THREE.Mesh(trimGeometry, flightTrimMaterial)
      trim.rotation.z = rotation
      trim.position.z = -0.184
      trim.scale.set(3.8 * scale, 5.2 * scale, 1)
      group.add(trim)
    }

    group.scale.setScalar(DART_SCALE)
    return group
  }

  _pointTipAt(dart, direction, roll = 0) {
    const align = new THREE.Quaternion().setFromUnitVectors(LOCAL_TIP_DIRECTION, direction.clone().normalize())
    const spin = new THREE.Quaternion().setFromAxisAngle(LOCAL_TIP_DIRECTION, roll)
    dart.quaternion.copy(align).multiply(spin)
  }

  _makeStickPose() {
    const direction = BASE_STICK_DIRECTION.clone()
    direction.x += (Math.random() - 0.5) * STICK_ANGLE_JITTER
    direction.y += (Math.random() - 0.5) * STICK_ANGLE_JITTER
    direction.normalize()

    return {
      direction,
      roll: Math.random() * Math.PI * 2,
    }
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
    const stickPose = this._makeStickPose()

    const update = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)

      // Parabolic arc
      dart.position.lerpVectors(startPos, endPos, t)
      dart.position.y += arcHeight * Math.sin(Math.PI * t)

      this._pointTipAt(dart, endPos.clone().sub(dart.position))

      if (t >= 1) {
        // Snap so the point enters the board and the body protrudes toward the camera.
        dart.position.copy(endPos).addScaledVector(stickPose.direction, -TIP_LOCAL_Z)
        this._pointTipAt(dart, stickPose.direction, stickPose.roll)

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
