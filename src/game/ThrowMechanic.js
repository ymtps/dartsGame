import * as THREE from 'three'
import { computeArc, applyDeviation } from './Ballistics.js'
import { getScoreAt } from '../utils/PolarGeometry.js'
import { BOARD_RADIUS } from '../scene/Board.js'
import { PrecisionBar } from '../ui/PrecisionBar.js'

// Max deviation radius applied by the precision bar (≈ 25% of board radius)
const MAX_DEVIATION = BOARD_RADIUS * 0.32

// Aim sway parameters — reticle drifts around mouse position in a Lissajous-like pattern
const SWAY_AMPLITUDE = BOARD_RADIUS * 0.10   // ≈10% of board radius
const SWAY_FREQ_X = 2.5                       // radians/second
const SWAY_FREQ_Y = 3.4                       // different frequency so pattern doesn't repeat trivially

// Throw origin (camera area)
const THROW_ORIGIN = new THREE.Vector3(0, -0.1, 3)

// Phase enum
const PHASE = Object.freeze({
  AIMING:    'aiming',     // reticle drifts; first click locks aim
  PRECISION: 'precision',  // precision bar active; click throws
})

export class ThrowMechanic {
  constructor(sceneManager, dartMesh, uiRoot) {
    this.sceneManager = sceneManager
    this.dartMesh = dartMesh
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.baseAim = null         // mouse-projected aim (without sway)
    this.swayedAim = null       // baseAim + sway offset (what will actually be thrown)
    this.lockedAim = null       // captured after first click
    this.dartsThrown = 0
    this._active = false
    this._phase = PHASE.AIMING
    this._onThrowComplete = null

    this.precisionBar = new PrecisionBar(uiRoot)
    this._swayReticle = this._buildReticle(0xffffff, 0.025, 0.034, 0.7)  // moving aim
    this._lockReticle = this._buildReticle(0xff4444, 0.018, 0.025, 0.95) // locked target marker
    sceneManager.scene.add(this._swayReticle, this._lockReticle)

    this._swayStart = performance.now()
    this._removeFrameCb = sceneManager.addFrameCallback(() => this._updateSway())

    this._bindEvents()
  }

  _buildReticle(color, inner, outer, opacity) {
    const geo = new THREE.RingGeometry(inner, outer, 32)
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    return mesh
  }

  _bindEvents() {
    const canvas = this.sceneManager.renderer.domElement
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e))
    document.addEventListener('click', () => this._onDocumentClick())

    // Touch support — passive: false allows preventDefault to block scroll/zoom
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches[0]) this._onMouseMove(e.touches[0], true)
    }, { passive: false })
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches[0]) this._onMouseMove(e.touches[0], true)
    }, { passive: false })
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      this._onDocumentClick()
    }, { passive: false })
  }

  // Pixels to shift the reticle above the fingertip on touch input
  static TOUCH_OFFSET_PX = 80

  _onMouseMove(e, isTouch = false) {
    if (!this._active || this.dartMesh.isAnimating) return
    if (this._phase !== PHASE.AIMING) return  // mouse ignored after aim lock

    const canvas = this.sceneManager.renderer.domElement
    const rect = canvas.getBoundingClientRect()
    const touchOffsetNDC = isTouch ? (ThrowMechanic.TOUCH_OFFSET_PX / rect.height) * 2 : 0
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1 + touchOffsetNDC

    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera)
    const boardMesh = this.sceneManager.getBoardMesh()
    if (!boardMesh) return

    const hits = this.raycaster.intersectObject(boardMesh)
    if (hits.length > 0) {
      this.baseAim = hits[0].point.clone()
    } else {
      this.baseAim = null
    }
  }

  /** Frame callback: update reticle position with sway offset */
  _updateSway() {
    if (!this._active || this.dartMesh.isAnimating) {
      this._swayReticle.visible = false
      return
    }

    if (this._phase === PHASE.AIMING) {
      if (!this.baseAim) {
        this._swayReticle.visible = false
        this.swayedAim = null
        return
      }

      const elapsed = (performance.now() - this._swayStart) / 1000
      const dx = SWAY_AMPLITUDE * Math.sin(elapsed * SWAY_FREQ_X)
      const dy = SWAY_AMPLITUDE * Math.sin(elapsed * SWAY_FREQ_Y + Math.PI / 3)

      this.swayedAim = this.baseAim.clone()
      this.swayedAim.x += dx
      this.swayedAim.y += dy

      this._swayReticle.position.copy(this.swayedAim)
      this._swayReticle.position.z += 0.001
      this._swayReticle.visible = true
    } else {
      // PRECISION phase: hide sway reticle, show locked reticle only
      this._swayReticle.visible = false
    }
  }

  _onDocumentClick() {
    if (!this._active || this.dartMesh.isAnimating) return

    if (this._phase === PHASE.AIMING) {
      // First click — lock aim at current swayed position
      if (!this.swayedAim) return  // cursor not on board

      this.lockedAim = this.swayedAim.clone()
      this._lockReticle.position.copy(this.lockedAim)
      this._lockReticle.position.z += 0.001
      this._lockReticle.visible = true

      this._phase = PHASE.PRECISION
      this.precisionBar.start()
      return
    }

    // PRECISION phase — second click throws
    const offset = this.precisionBar.getOffset()
    const landingPoint = applyDeviation(this.lockedAim, offset, MAX_DEVIATION)

    // Clamp to board area so dart never flies completely off
    const dist = Math.sqrt(landingPoint.x ** 2 + landingPoint.y ** 2)
    if (dist > BOARD_RADIUS * 1.05) {
      landingPoint.x *= (BOARD_RADIUS * 1.05) / dist
      landingPoint.y *= (BOARD_RADIUS * 1.05) / dist
    }

    this.precisionBar.stop()
    this._lockReticle.visible = false
    this._swayReticle.visible = false

    const scoreInfo = getScoreAt(landingPoint.x, landingPoint.y, BOARD_RADIUS)

    this.dartMesh.throwTo(THROW_ORIGIN, landingPoint, 600, () => {
      this.dartsThrown++
      this._onThrowComplete?.(scoreInfo, this.dartsThrown)
    })
  }

  /**
   * Activate the player's throw turn — enters AIMING phase.
   */
  startTurn(onThrowComplete) {
    this._active = true
    this.dartsThrown = 0
    this._onThrowComplete = onThrowComplete
    this._phase = PHASE.AIMING
    this._swayStart = performance.now()
    this.lockedAim = null
    this._lockReticle.visible = false
    this.precisionBar.stop()  // bar hidden until aim is locked
  }

  /**
   * Reset to AIMING phase for the next dart in the same turn.
   */
  resumeBar() {
    if (!this._active) return
    this._phase = PHASE.AIMING
    this._swayStart = performance.now()
    this.lockedAim = null
    this._lockReticle.visible = false
    this.precisionBar.stop()
  }

  /** Deactivate at end of player's turn */
  endTurn() {
    this._active = false
    this.precisionBar.stop()
    this._swayReticle.visible = false
    this._lockReticle.visible = false
  }
}
