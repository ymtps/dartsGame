import { SceneManager } from './scene/SceneManager.js'

const canvas = document.getElementById('game-canvas')
const sceneManager = new SceneManager(canvas)
sceneManager.start()

// TODO: wire up GameState, Board, ThrowMechanic, HUD in subsequent units
window._sceneManager = sceneManager
