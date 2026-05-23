import { describe, it, expect, beforeEach } from 'vitest'
import { Cricket } from '../src/game/modes/Cricket.js'

describe('Cricket', () => {
  let game

  beforeEach(() => {
    game = new Cricket()
  })

  describe('basic close mechanics', () => {
    it('accumulates hits toward close', () => {
      game.applyThrow('player', { number: 20, multiplier: 1, points: 20, region: 'single' })
      expect(game.state.player[20]).toBe(1)
    })

    it('triple counts as 3 hits (closes immediately)', () => {
      game.applyThrow('player', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      expect(game.state.player[20]).toBe(3)
    })

    it('does not exceed 3 hits on state', () => {
      game.applyThrow('player', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      game.applyThrow('player', { number: 20, multiplier: 1, points: 20, region: 'single' })
      expect(game.state.player[20]).toBe(3)
    })
  })

  describe('scoring after close', () => {
    it('scores when player closed but CPU has not', () => {
      // Player closes 20
      game.applyThrow('player', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      // Player hits 20 again — CPU hasn't closed yet
      game.applyThrow('player', { number: 20, multiplier: 1, points: 20, region: 'single' })
      expect(game.playerScore).toBe(20)
    })

    it('does not score when opponent already closed the number', () => {
      // Both close 20
      game.applyThrow('player', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      game.applyThrow('cpu', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      // Player hits 20 again — CPU is closed so no score
      game.applyThrow('player', { number: 20, multiplier: 1, points: 20, region: 'single' })
      expect(game.playerScore).toBe(0)
    })

    it('excess counts on close throw score correctly', () => {
      // Player has 2 hits on 19
      game.applyThrow('player', { number: 19, multiplier: 2, points: 38, region: 'double' })
      // Player hits triple 19 (3 counts) — 1 count closes, 2 counts score (19×2=38)
      game.applyThrow('player', { number: 19, multiplier: 3, points: 57, region: 'triple' })
      expect(game.state.player[19]).toBe(3)
      expect(game.playerScore).toBe(38)  // 2 excess counts × 19
    })
  })

  describe('Bull mechanics', () => {
    it('inner bull (double_bull) counts as 2 hits and scores 50', () => {
      // Player closes Bull first with single bull
      game.applyThrow('player', { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
      game.applyThrow('player', { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
      game.applyThrow('player', { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
      expect(game.state.player[25]).toBe(3)

      // Inner bull hit after close — CPU hasn't closed → scores 50
      game.applyThrow('player', { number: 25, multiplier: 2, points: 50, region: 'double_bull' })
      expect(game.playerScore).toBe(50)
    })

    it('inner bull before close = 2 counts', () => {
      game.applyThrow('player', { number: 25, multiplier: 2, points: 50, region: 'double_bull' })
      expect(game.state.player[25]).toBe(2)
    })

    it('outer bull = 1 count, 25pts when scoring', () => {
      game.applyThrow('player', { number: 25, multiplier: 2, points: 50, region: 'double_bull' })
      game.applyThrow('player', { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
      expect(game.state.player[25]).toBe(3)
      // Outer bull after close — CPU hasn't closed → scores 25
      game.applyThrow('player', { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
      expect(game.playerScore).toBe(25)
    })
  })

  describe('non-cricket numbers are ignored', () => {
    it('number outside 15-20 or Bull returns counted=false', () => {
      const result = game.applyThrow('player', { number: 14, multiplier: 1, points: 14, region: 'single' })
      expect(result.counted).toBe(false)
    })
  })

  describe('win condition', () => {
    function closeAll(side) {
      for (const n of [15, 16, 17, 18, 19, 20]) {
        game.applyThrow(side, { number: n, multiplier: 3, points: n * 3, region: 'triple' })
      }
      // Close Bull: inner bull (2 counts) + outer bull (1 count) = 3 counts
      game.applyThrow(side, { number: 25, multiplier: 2, points: 50, region: 'double_bull' })
      game.applyThrow(side, { number: 25, multiplier: 1, points: 25, region: 'single_bull' })
    }

    it('wins when all closed and score >= opponent', () => {
      closeAll('player')
      expect(game.checkWin('player')).toBe(true)
    })

    it('does not win when not all closed', () => {
      game.applyThrow('player', { number: 20, multiplier: 3, points: 60, region: 'triple' })
      expect(game.checkWin('player')).toBe(false)
    })

    it('does not win when score < opponent even if all closed', () => {
      closeAll('player')
      // CPU scores while player has no points
      game.applyThrow('cpu', { number: 20, multiplier: 3, points: 60, region: 'triple' })  // close
      game.applyThrow('cpu', { number: 20, multiplier: 1, points: 20, region: 'single' })  // score 20
      // Player has 0, CPU hasn't closed all yet... but let's simulate player < CPU with 0
      game.playerScore = 0
      game.cpuScore = 20
      expect(game.checkWin('player')).toBe(false)
    })
  })
})
