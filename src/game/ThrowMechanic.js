import * as THREE from 'three'
import { computeArc, applyDeviation } from './Ballistics.js'
import { getScoreAt } from '../utils/PolarGeometry.js'
import { BOARD_RADIUS } from '../scene/Board.js'
import { PrecisionBar } from '../ui/PrecisionBar.js'

// Max deviation radius in world units (≈ 25% of board radius — significant penalty for bad timing)
const MAX_DEVIATION = BOARD_RADIUS * 0.25

// Throw origin (camera position, slightly below center)
const THROW_ORIGIN = new THREE.Vector3(0, -0.1, 3)

export class ThrowMechanic {
  constructor(sceneManager, dartMesh, uiRoot) {
    this.sceneManager = sceneManager
    this.dartMesh = dartMesh
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.aimPoint = null        // current board-surface aim point (Three.js Vector3)
    this.dartsThrown = 0        // 0-3 per turn
    this._active = false        // is it the player's turn?
    this._onThrowComplete = null

    this.precisionBar = new PrecisionBar(uiRoot)
    this._reticle = this._buildReticle()
    sceneManager.scene.add(this._reticle)

    this._bindEvents()
  }

  _buildReticle() {
    const geo = new THREE.RingGeometry(0.02, 0.03, 32)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    return mesh
  }

  _bindEvents() {
    const canvas = this.sceneManager.renderer.domElement

    // Mousemove: update aim reticle (only reads from canvas — no pointer-events blocking)
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e))

    // Click — document-level listener so it fires regardless of any overlay
    // (PrecisionBar and HUD are pointer-events:none, so clicks always reach here)
    document.addEventListener('click', (e) => this._onDocumentClick(e))
  }

  _onMouseMove(e) {
    if (!this._active || this.dartMesh.isAnimating) return

    const canvas = this.sceneManager.renderer.domElement
    const rect = canvas.getBoundingClientRect()

    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera)

    const boardMesh = this.sceneManager.getBoardMesh()
    if (!boardMesh) return

    const hits = this.raycaster.intersectObject(boardMesh)
    if (hits.length > 0) {
      const point = hits[0].point
      this.aimPoint = point.clone()
      this._reticle.position.copy(point)
      this._reticle.position.z += 0.001  // just above board surface
      this._reticle.visible = true
    } else {
      this.aimPoint = null
      this._reticle.visible = false
    }
  }

  _onDocumentClick(e) {
    if (!this._active || this.dartMesh.isAnimating) return
    if (!this.aimPoint) return  // cursor not on board

    // Capture current bar state and throw
    const offset = this.precisionBar.getOffset()
    const landingPoint = applyDeviation(this.aimPoint, offset, MAX_DEVIATION)

    // Clamp to board area so dart never flies completely off
    const dist = Math.sqrt(landingPoint.x ** 2 + landingPoint.y ** 2)
    if (dist > BOARD_RADIUS * 1.05) {
      landingPoint.x *= (BOARD_RADIUS * 1.05) / dist
      landingPoint.y *= (BOARD_RADIUS * 1.05) / dist
    }

    this.precisionBar.stop()
    this._reticle.visible = false

    // Get score from local board coordinates
    // Board is at origin in XY plane; landingPoint is already in board-local space
    const scoreInfo = getScoreAt(landingPoint.x, landingPoint.y, BOARD_RADIUS)

    this.dartMesh.throwTo(THROW_ORIGIN, landingPoint, 600, () => {
      this.dartsThrown++
      this._onThrowComplete?.(scoreInfo, this.dartsThrown)
    })
  }

  /**
   * Activate the player's throw turn.
   * @param {function} onThrowComplete - (scoreInfo, dartsThrown) called after each dart lands
   */
  startTurn(onThrowComplete) {
    this._active = true
    this.dartsThrown = 0
    this._onThrowComplete = onThrowComplete
    this.precisionBar.start()
  }

  /**
   * Resume precision bar after a dart has landed (for subsequent throws in same turn).
   */
  resumeBar() {
    if (this._active) {
      this.precisionBar.start()
    }
  }

  /** Deactivate at end of player's turn */
  endTurn() {
    this._active = false
    this.precisionBar.stop()
    this._reticle.visible = false
  }
}
