import * as THREE from 'three'

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas
    this.frameCallbacks = []

    this._initRenderer()
    this._initScene()
    this._initCamera()
    this._initLights()
    this._bindResize()
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  _initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, 8, 20)
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 50)
    this.camera.position.set(0, 0, 3)
    this.camera.lookAt(0, 0, 0)
    this._fitCamera()
  }

  /**
   * Adjust camera Z so the full board visual radius fits both axes.
   * On portrait screens the horizontal FOV shrinks, so the camera pulls back.
   * Board.js: VISUAL_RADIUS = BOARD_RADIUS(1.0) / PLAY_FIELD_FRAC(0.86) ≈ 1.163
   */
  _fitCamera() {
    const aspect = window.innerWidth / window.innerHeight
    const tanHalfFov = Math.tan(this.camera.fov * Math.PI / 360)
    const VISUAL_RADIUS = 1.163
    const pad = 1.15

    const zForWidth  = (VISUAL_RADIUS * pad) / (tanHalfFov * aspect)
    const zForHeight = (VISUAL_RADIUS * pad) / tanHalfFov
    this.camera.position.z = Math.max(zForWidth, zForHeight, 3)
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 1.2)
    directional.position.set(2, 4, 3)
    directional.castShadow = true
    directional.shadow.mapSize.set(1024, 1024)
    directional.shadow.camera.near = 0.1
    directional.shadow.camera.far = 20
    this.scene.add(directional)

    // Warm fill light from below (bar atmosphere)
    const fill = new THREE.PointLight(0xff8844, 0.3, 10)
    fill.position.set(-2, -2, 2)
    this.scene.add(fill)
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth
      const h = window.innerHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(w, h)
      this._fitCamera()
    })
  }

  /** Register a per-frame callback. Returns an unregister function. */
  addFrameCallback(fn) {
    this.frameCallbacks.push(fn)
    return () => {
      this.frameCallbacks = this.frameCallbacks.filter((f) => f !== fn)
    }
  }

  /** Expose board mesh for raycasting from ThrowMechanic */
  setBoardMesh(mesh) {
    this.boardMesh = mesh
  }

  getBoardMesh() {
    return this.boardMesh
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate)
      for (const fn of this.frameCallbacks) fn()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }
}
