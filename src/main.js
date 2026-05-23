import * as THREE from 'three'
import { SceneManager } from './scene/SceneManager.js'
import { Board, BOARD_RADIUS } from './scene/Board.js'
import { DartMesh } from './scene/DartMesh.js'
import { ThrowMechanic } from './game/ThrowMechanic.js'
import { GameState, STATE } from './game/GameState.js'
import { Game501 } from './game/modes/Game501.js'
import { Cricket } from './game/modes/Cricket.js'
import { CPU } from './game/CPU.js'
import { StartScreen } from './ui/StartScreen.js'
import { ResultScreen } from './ui/ResultScreen.js'
import { HUD } from './ui/HUD.js'
import { TurnIndicator } from './ui/TurnIndicator.js'
import { SoundToggle } from './ui/SoundToggle.js'
import { SoundManager } from './audio/SoundManager.js'
import { getScoreAt } from './utils/PolarGeometry.js'

const canvas = document.getElementById('game-canvas')
const uiRoot = document.getElementById('ui-root')

// Build scene
const sceneManager = new SceneManager(canvas)
const board = new Board(sceneManager.scene)
sceneManager.setBoardMesh(board.getMesh())
const dartMesh = new DartMesh(sceneManager.scene, sceneManager)
sceneManager.start()

// Audio
const sound = new SoundManager()

// Build UI
const startScreen = new StartScreen(uiRoot)
const resultScreen = new ResultScreen(uiRoot)
const hud = new HUD(uiRoot)
const turnIndicator = new TurnIndicator(uiRoot, sound)
const soundToggle = new SoundToggle(uiRoot, sound)
const throwMechanic = new ThrowMechanic(sceneManager, dartMesh, uiRoot)

// Game state and engines
const gameState = new GameState()
let modeEngine = null
let cpu = null
let lastSettings = null

const throwOrigin = new THREE.Vector3(0, -0.1, 3)

function startNewGame(mode, difficulty) {
  lastSettings = { mode, difficulty }

  // Construct engine
  if (mode === '501' || mode === '301') {
    modeEngine = new Game501(mode === '501' ? 501 : 301)
  } else {
    modeEngine = new Cricket()
  }

  cpu = new CPU(difficulty)

  playerHistory = []
  cpuHistory = []
  gameState.startGame({ mode, difficulty })
  modeEngine.beginTurn?.('player')

  hud.show(mode, () => gameState.requestReset())
  updateHud([])

  // Show "あなたのターン" before the first turn begins
  turnIndicator.show('player', () => {
    throwMechanic.startTurn(onPlayerLanded)
  })
}

function buildScoreLabel(scoreInfo) {
  if (!scoreInfo) return '—'
  if (scoreInfo.region === 'miss') return 'Miss'
  if (scoreInfo.region === 'double_bull') return 'DB'
  if (scoreInfo.region === 'single_bull') return 'B'
  const prefix = scoreInfo.multiplier === 3 ? 'T' : (scoreInfo.multiplier === 2 ? 'D' : '')
  return `${prefix}${scoreInfo.number}`
}

let currentTurnDartScores = []
let playerHistory = []
let cpuHistory = []

function recordPlayerTurn(bust = false) {
  playerHistory.unshift({
    labels: currentTurnDartScores.map(d => d.label),
    total: bust ? null : currentTurnDartScores.reduce((s, d) => s + d.points, 0),
    bust,
  })
}

function recordCpuTurn(scores, bust = false) {
  cpuHistory.unshift({
    labels: scores.map(d => d.label),
    total: bust ? null : scores.reduce((s, d) => s + d.points, 0),
    bust,
  })
}

function updateHud(dartScores) {
  const baseState = modeEngine.getState()
  hud.update({
    mode: lastSettings.mode,
    currentTurn: gameState.currentTurn,
    dartsThrown: gameState.dartsThrown,
    roundsPlayed: gameState.roundsPlayed,
    dartScores,
    playerScore: baseState.playerScore,
    cpuScore: baseState.cpuScore,
    cricketState: baseState.cricketState ?? null,
    playerHistory,
    cpuHistory,
  })
}

/** Transition to CPU turn with indicator */
function handoffToCpu() {
  throwMechanic.endTurn()
  currentTurnDartScores = []
  dartMesh.clearDarts()
  modeEngine.beginTurn?.('cpu')
  updateHud([])
  turnIndicator.show('cpu', () => runCpuTurn())
}

/** Transition to player turn with indicator */
function handoffToPlayer() {
  dartMesh.clearDarts()
  modeEngine.beginTurn?.('player')
  updateHud([])
  turnIndicator.show('player', () => throwMechanic.startTurn(onPlayerLanded))
}

// --- Player turn handling ---
function onPlayerLanded(scoreInfo, dartsThrown) {
  sound.playDartHit()
  gameState.onThrow()  // PLAYER_TURN → DART_FLYING (state for the throw)

  // Apply scoring
  const result = modeEngine.applyThrow('player', scoreInfo)
  currentTurnDartScores.push({ points: scoreInfo.points, label: buildScoreLabel(scoreInfo) })

  if (result.bust) {
    // Bust — clear darts, flash BUST, end turn
    updateHud(currentTurnDartScores)
    hud.showBust(() => {
      gameState.onLanded({ endTurn: true })  // immediately to CPU
      recordPlayerTurn(true)
      handoffToCpu()
    })
    return
  }

  updateHud(currentTurnDartScores)

  // Check win
  if (modeEngine.checkWin('player')) {
    finishGame('player')
    return
  }

  gameState.onLanded()  // PLAYER_TURN or CPU_THINKING

  if (gameState.current === STATE.CPU_THINKING) {
    // Turn complete — hand off to CPU
    recordPlayerTurn()
    handoffToCpu()
  } else {
    // Next dart in same turn — restart bar
    throwMechanic.resumeBar()
  }
}

// --- CPU turn handling ---
function runCpuTurn() {
  throwMechanic.endTurn()
  updateHud([])

  let cpuDartScores = []

  cpu.executeTurn({
    mode: lastSettings.mode,
    getState: () => modeEngine.getState(),
    onThrow: (landingPoint, dartIndex, dartLandedCallback) => {
      gameState.onCpuThrow()

      // Animate the CPU dart
      dartMesh.throwTo(throwOrigin, landingPoint, 600, () => {
        sound.playDartHit()
        const scoreInfo = getScoreAt(landingPoint.x, landingPoint.y, BOARD_RADIUS)
        const result = modeEngine.applyThrow('cpu', scoreInfo)
        cpuDartScores.push({ points: scoreInfo.points, label: buildScoreLabel(scoreInfo) })

        if (result.bust) {
          updateHud(cpuDartScores)
          hud.showBust(() => {
            cpu.cancel()  // skip remaining throws
            recordCpuTurn(cpuDartScores, true)
            cpuDartScores = []
            gameState.onCpuLanded({ endTurn: true })
            handoffToPlayer()
          })
          return
        }

        updateHud(cpuDartScores)

        if (modeEngine.checkWin('cpu')) {
          finishGame('cpu')
          return
        }

        gameState.onCpuLanded()
        dartLandedCallback()
      })
    },
    onAllDone: () => {
      if (gameState.current === STATE.PLAYER_TURN) {
        // CPU turn ended naturally — back to player
        recordCpuTurn(cpuDartScores)
        handoffToPlayer()
      }
    },
  })
}

function finishGame(winner) {
  cpu?.cancel()
  turnIndicator.cancel()
  throwMechanic.endTurn()
  hud.hide()
  const state = modeEngine.getState()
  resultScreen.show(winner, {
    mode: lastSettings.mode,
    playerScore: state.playerScore,
    cpuScore: state.cpuScore,
    rounds: gameState.roundsPlayed,
  }, {
    onReplay: () => {
      dartMesh.clearDarts()
      startNewGame(lastSettings.mode, lastSettings.difficulty)
    },
    onMenu: () => {
      dartMesh.clearDarts()
      showStartScreen()
    },
  })
}

// --- Reset confirmation ---
function showResetDialog() {
  // Simple confirm — quick implementation
  if (window.confirm('ゲームを中断してスタート画面に戻りますか？')) {
    cpu?.cancel()
    turnIndicator.cancel()
    throwMechanic.endTurn()
    dartMesh.clearDarts()
    hud.hide()
    gameState.confirmReset()
    showStartScreen()
  } else {
    gameState.cancelReset()
  }
}

gameState.on(STATE.CONFIRM_RESET, () => {
  showResetDialog()
})

// --- Start ---
function showStartScreen() {
  startScreen.show((mode, difficulty) => startNewGame(mode, difficulty))
}

showStartScreen()

// Debug handle
window._game = { gameState, modeEngine: () => modeEngine, sceneManager }
