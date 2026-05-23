import { describe, it, expect, beforeEach } from 'vitest'
import { Game501 } from '../src/game/modes/Game501.js'

describe('Game501', () => {
  let game

  beforeEach(() => {
    game = new Game501(501)
  })

  describe('basic scoring', () => {
    it('subtracts points from player score', () => {
      game.beginTurn('player')
      game.applyThrow('player', { points: 60 })  // T20
      expect(game.playerScore).toBe(441)
    })

    it('does not affect CPU score on player throw', () => {
      game.beginTurn('player')
      game.applyThrow('player', { points: 60 })
      expect(game.cpuScore).toBe(501)
    })
  })

  describe('bust detection', () => {
    it('returns bust when score goes below 0', () => {
      game = new Game501(2)
      game.beginTurn('player')
      const result = game.applyThrow('player', { points: 3 })
      expect(result.bust).toBe(true)
    })

    it('restores entire turn on bust', () => {
      game = new Game501(50)
      game.beginTurn('player')
      game.applyThrow('player', { points: 20 })  // 50 → 30
      game.applyThrow('player', { points: 20 })  // 30 → 10
      const result = game.applyThrow('player', { points: 15 })  // 10 → -5 BUST
      expect(result.bust).toBe(true)
      expect(game.playerScore).toBe(50)  // restored to turn start
    })

    it('does not bust on exactly 0', () => {
      game = new Game501(20)
      game.beginTurn('player')
      const result = game.applyThrow('player', { points: 20 })
      expect(result.bust).toBe(false)
      expect(result.won).toBe(true)
    })
  })

  describe('win detection', () => {
    it('checkWin returns true when score reaches 0', () => {
      game = new Game501(20)
      game.beginTurn('player')
      game.applyThrow('player', { points: 20 })
      expect(game.checkWin('player')).toBe(true)
    })

    it('checkWin returns false when score > 0', () => {
      game.beginTurn('player')
      expect(game.checkWin('player')).toBe(false)
    })
  })

  describe('301 variant', () => {
    it('starts at 301', () => {
      const game301 = new Game501(301)
      expect(game301.playerScore).toBe(301)
      expect(game301.cpuScore).toBe(301)
    })
  })

  describe('getState', () => {
    it('returns current scores', () => {
      game.beginTurn('player')
      game.applyThrow('player', { points: 60 })
      const state = game.getState()
      expect(state.playerScore).toBe(441)
      expect(state.cpuScore).toBe(501)
    })
  })
})
