import * as THREE from 'three'
import { SECTOR_NUMBERS } from '../utils/PolarGeometry.js'

export const BOARD_RADIUS = 1.0  // Three.js world units — exported for ThrowMechanic

/** Pixel radius in the canvas texture */
const TEX_SIZE = 1024
const CX = TEX_SIZE / 2
const CY = TEX_SIZE / 2
const TEX_R = TEX_SIZE / 2 - 4  // leave tiny padding

// Ring boundaries as fraction of TEX_R
const FRAC = {
  DOUBLE_BULL: 0.0374,
  SINGLE_BULL: 0.0935,
  INNER_SINGLE: 0.5824,
  TRIPLE_INNER: 0.5824,
  TRIPLE_OUTER: 0.6294,
  OUTER_SINGLE_OUTER: 0.9529,
  DOUBLE_OUTER: 1.0,
}

const COLORS = {
  black: '#1a1a1a',
  cream: '#f5f0d8',
  red: '#cc2222',
  green: '#1a7a2a',
  bullGreen: '#1a7a2a',
  bullRed: '#cc2222',
  wire: '#888888',
  numberText: '#f5f0d8',
  background: '#111111',
}

function drawSectors(ctx, innerR, outerR, colorA, colorB) {
  const sectorAngle = (2 * Math.PI) / 20
  const startOffset = -Math.PI / 2 - sectorAngle / 2  // top of board, offset by half sector

  for (let i = 0; i < 20; i++) {
    const startAngle = startOffset + i * sectorAngle
    const endAngle = startAngle + sectorAngle
    const color = i % 2 === 0 ? colorA : colorB

    ctx.beginPath()
    ctx.moveTo(CX, CY)
    ctx.arc(CX, CY, outerR, startAngle, endAngle)
    ctx.arc(CX, CY, innerR, endAngle, startAngle, true)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
}

function buildBoardTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')

  const r = (frac) => frac * TEX_R

  // Background
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  // Outer circle clip
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, TEX_R, 0, Math.PI * 2)
  ctx.clip()

  // Double ring
  drawSectors(ctx, r(FRAC.OUTER_SINGLE_OUTER), r(FRAC.DOUBLE_OUTER), COLORS.red, COLORS.green)

  // Outer singles
  drawSectors(ctx, r(FRAC.TRIPLE_OUTER), r(FRAC.OUTER_SINGLE_OUTER), COLORS.black, COLORS.cream)

  // Triple ring
  drawSectors(ctx, r(FRAC.TRIPLE_INNER), r(FRAC.TRIPLE_OUTER), COLORS.red, COLORS.green)

  // Inner singles
  drawSectors(ctx, r(FRAC.SINGLE_BULL), r(FRAC.INNER_SINGLE), COLORS.black, COLORS.cream)

  // Single bull
  ctx.beginPath()
  ctx.arc(CX, CY, r(FRAC.SINGLE_BULL), 0, Math.PI * 2)
  ctx.fillStyle = COLORS.bullGreen
  ctx.fill()

  // Double bull
  ctx.beginPath()
  ctx.arc(CX, CY, r(FRAC.DOUBLE_BULL), 0, Math.PI * 2)
  ctx.fillStyle = COLORS.bullRed
  ctx.fill()

  ctx.restore()

  // Wire outline
  ctx.beginPath()
  ctx.arc(CX, CY, TEX_R, 0, Math.PI * 2)
  ctx.strokeStyle = COLORS.wire
  ctx.lineWidth = 3
  ctx.stroke()

  // Number labels
  const labelR = TEX_R * 1.06
  const sectorAngle = (2 * Math.PI) / 20
  const startOffset = -Math.PI / 2  // top

  ctx.font = `bold ${Math.round(TEX_R * 0.09)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < 20; i++) {
    const angle = startOffset + i * sectorAngle
    const lx = CX + Math.cos(angle) * labelR
    const ly = CY + Math.sin(angle) * labelR

    ctx.fillStyle = COLORS.numberText
    ctx.fillText(String(SECTOR_NUMBERS[i]), lx, ly)
  }

  return new THREE.CanvasTexture(canvas)
}

export class Board {
  constructor(scene) {
    this.scene = scene
    this._buildMesh()
    this._buildSurround()
  }

  _buildMesh() {
    const texture = buildBoardTexture()
    texture.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.CircleGeometry(BOARD_RADIUS, 64)
    const material = new THREE.MeshLambertMaterial({ map: texture })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(0, 0, 0)
    this.mesh.receiveShadow = true
    this.mesh.name = 'dartboard'
    this.scene.add(this.mesh)
  }

  _buildSurround() {
    // Wooden backing circle behind the board
    const surround = new THREE.Mesh(
      new THREE.CircleGeometry(BOARD_RADIUS * 1.18, 64),
      new THREE.MeshLambertMaterial({ color: 0x5c3a1e })
    )
    surround.position.set(0, 0, -0.01)
    this.scene.add(surround)

    // Dark wall panel
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshLambertMaterial({ color: 0x0d0d0d })
    )
    panel.position.set(0, 0, -0.05)
    this.scene.add(panel)
  }

  /** The primary mesh used for raycasting */
  getMesh() {
    return this.mesh
  }
}
