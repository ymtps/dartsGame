import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameState, STATE } from '../src/game/GameState.js'

describe('GameState', () => {
  let gs

  beforeEach(() => {
    gs = new GameState()
  })

  it('starts in START_SCREEN', () => {
    expect(gs.current).toBe(STATE.START_SCREEN)
  })

  describe('startGame', () => {
    it('transitions to PLAYER_TURN', () => {
      gs.startGame({ mode: '501', difficulty: 'medium' })
      expect(gs.current).toBe(STATE.PLAYER_TURN)
    })

    it('sets mode and difficulty', () => {
      gs.startGame({ mode: '501', difficulty: 'medium' })
      expect(gs.mode).toBe('501')
      expect(gs.difficulty).toBe('medium')
    })

    it('resets dartsThrown and currentTurn', () => {
      gs.startGame({ mode: '501', difficulty: 'easy' })
      expect(gs.dartsThrown).toBe(0)
      expect(gs.currentTurn).toBe('player')
    })
  })

  describe('throw flow', () => {
    beforeEach(() => gs.startGame({ mode: '501', difficulty: 'medium' }))

    it('PLAYER_TURN → DART_FLYING on onThrow()', () => {
      gs.onThrow()
      expect(gs.current).toBe(STATE.DART_FLYING)
    })

    it('DART_FLYING → PLAYER_TURN on onLanded() when darts remain', () => {
      gs.onThrow()
      gs.onLanded()
      expect(gs.current).toBe(STATE.PLAYER_TURN)
      expect(gs.dartsThrown).toBe(1)
    })

    it('3rd dart → CPU_THINKING', () => {
      gs.onThrow(); gs.onLanded()
      gs.onThrow(); gs.onLanded()
      gs.onThrow(); gs.onLanded()
      expect(gs.current).toBe(STATE.CPU_THINKING)
      expect(gs.dartsThrown).toBe(0)
      expect(gs.currentTurn).toBe('cpu')
    })

    it('endTurn flag immediately hands off to CPU', () => {
      gs.onThrow()
      gs.onLanded({ endTurn: true })
      expect(gs.current).toBe(STATE.CPU_THINKING)
    })
  })

  describe('CPU turn flow', () => {
    beforeEach(() => {
      gs.startGame({ mode: '501', difficulty: 'medium' })
      // Complete player turn first
      gs.onThrow(); gs.onLanded()
      gs.onThrow(); gs.onLanded()
      gs.onThrow(); gs.onLanded()
    })

    it('CPU_THINKING → CPU_DART_FLYING on onCpuThrow()', () => {
      gs.onCpuThrow()
      expect(gs.current).toBe(STATE.CPU_DART_FLYING)
    })

    it('3 CPU darts → back to PLAYER_TURN', () => {
      gs.onCpuThrow(); gs.onCpuLanded()
      gs.onCpuThrow(); gs.onCpuLanded()
      gs.onCpuThrow(); gs.onCpuLanded()
      expect(gs.current).toBe(STATE.PLAYER_TURN)
      expect(gs.currentTurn).toBe('player')
    })
  })

  describe('reset flow', () => {
    beforeEach(() => gs.startGame({ mode: '501', difficulty: 'medium' }))

    it('requestReset → CONFIRM_RESET', () => {
      gs.requestReset()
      expect(gs.current).toBe(STATE.CONFIRM_RESET)
    })

    it('confirmReset → START_SCREEN and clears state', () => {
      gs.requestReset()
      gs.confirmReset()
      expect(gs.current).toBe(STATE.START_SCREEN)
      expect(gs.mode).toBeNull()
    })

    it('cancelReset → returns to previous state', () => {
      gs.requestReset()  // was PLAYER_TURN
      gs.cancelReset()
      expect(gs.current).toBe(STATE.PLAYER_TURN)
    })
  })

  describe('guard conditions', () => {
    it('onThrow() while in DART_FLYING has no effect', () => {
      gs.startGame({ mode: '501', difficulty: 'easy' })
      gs.onThrow()
      expect(gs.current).toBe(STATE.DART_FLYING)
      gs.onThrow()  // second call — should not change state
      expect(gs.current).toBe(STATE.DART_FLYING)
    })
  })

  describe('listeners', () => {
    it('fires listener when transitioning to that state', () => {
      const fn = vi.fn()
      gs.on(STATE.PLAYER_TURN, fn)
      gs.startGame({ mode: 'cricket', difficulty: 'hard' })
      expect(fn).toHaveBeenCalledOnce()
    })
  })
})
