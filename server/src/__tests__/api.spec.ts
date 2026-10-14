import { beforeEach, describe, expect, it } from 'vitest'
import { GameApi, type Broadcaster } from '../api.js'
import { MemoryStore } from '../memoryStore.js'
import { seededGame } from '../seededGame.js'
import type { ActiveGame } from '../serverModel.js'

let broadcastGames: ActiveGame[]
let api: GameApi

beforeEach(() => {
  broadcastGames = []
  const broadcaster: Broadcaster = {
    async broadcastGame(game) {
      broadcastGames.push(game)
    },
  }
  api = new GameApi(broadcaster, new MemoryStore(seededGame()), () => 0)
})

const noColour = { color: undefined, sayUno: false }

describe('createApi', () => {
  it('broadcasts the game after a successful move', async () => {
    await api.playCard('0', 'Alice', { cardIndex: 0, ...noColour })
    expect(broadcastGames.map((game) => game.id)).toEqual(['0'])
  })

  it('does not broadcast a forbidden move', async () => {
    await api.playCard('0', 'Bob', { cardIndex: 0, ...noColour })
    expect(broadcastGames).toEqual([])
  })

  it('does not broadcast an illegal move', async () => {
    await api.playCard('0', 'Alice', { cardIndex: 1, ...noColour })
    expect(broadcastGames).toEqual([])
  })

  it('broadcasts a started game', async () => {
    await api.startGame('7', ['Ann', 'Ben'])
    expect(broadcastGames.map((game) => game.id)).toEqual(['7'])
  })

  it('does not broadcast a lookup', async () => {
    await api.findGame('0')
    expect(broadcastGames).toEqual([])
  })
})
