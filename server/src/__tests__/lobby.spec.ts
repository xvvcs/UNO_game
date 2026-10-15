import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryStore } from '../memoryStore.js'
import type { ServerResponse } from '../response.js'
import { ServerModel, type ServerError } from '../serverModel.js'

let model: ServerModel

beforeEach(() => {
  let nextId = 1
  model = new ServerModel(
    new MemoryStore(),
    () => 0,
    () => `g${nextId++}`,
  )
})

function valueOf<Value>(response: ServerResponse<Value, ServerError>): Promise<Value | undefined> {
  return response.resolve({ onSuccess: async (value) => value, onError: async () => undefined })
}

function errorOf<Value>(
  response: ServerResponse<Value, ServerError>,
): Promise<ServerError | undefined> {
  return response.resolve({ onSuccess: async () => undefined, onError: async (error) => error })
}

async function playersWaiting(id: string) {
  return (await valueOf(await model.findPendingGame(id)))?.players
}

describe('lobby', () => {
  it('creates a pending game with the creator in the first seat', async () => {
    expect(await valueOf(await model.createGame('Ann', 3))).toEqual({
      id: 'g1',
      pending: true,
      creator: 'Ann',
      players: ['Ann'],
      numberOfPlayers: 3,
    })
    expect(await model.pendingGames()).toHaveLength(1)
  })

  it('seats joining players in the order they join', async () => {
    await model.createGame('Ann', 4)
    await model.joinGame('g1', 'Ben')
    await model.joinGame('g1', 'Cid')
    expect(await playersWaiting('g1')).toEqual(['Ann', 'Ben', 'Cid'])
  })

  it('starts the game when the last seat is taken', async () => {
    await model.createGame('Ann', 2)
    const joined = await valueOf(await model.joinGame('g1', 'Ben'))
    expect(joined?.pending).toBe(false)
    expect(await model.pendingGames()).toEqual([])
    const started = await valueOf(await model.findGame('g1'))
    expect(started?.round.player(1)).toBe('Ben')
  })

  it('reports joining an unknown game', async () => {
    expect(await errorOf(await model.joinGame('nope', 'Ann'))).toEqual({
      type: 'Not Found',
      key: 'nope',
    })
  })

  it('keeps a player from waiting in two games at once', async () => {
    await model.createGame('Ann', 3)
    await model.createGame('Ben', 3)
    expect(await errorOf(await model.joinGame('g1', 'Ann'))).toMatchObject({ type: 'Conflict' })
    expect(await errorOf(await model.joinGame('g2', 'Ann'))).toMatchObject({ type: 'Conflict' })
    expect(await errorOf(await model.createGame('Ann', 2))).toMatchObject({ type: 'Conflict' })
    expect(await model.pendingGames()).toHaveLength(2)
  })

  it('lets a player wait for a new game after their last one started', async () => {
    await model.createGame('Ann', 2)
    await model.joinGame('g1', 'Ben')
    expect(await errorOf(await model.createGame('Ann', 2))).toBeUndefined()
  })

  it('removes a leaving player and hands the game to the next player', async () => {
    await model.createGame('Ann', 4)
    await model.joinGame('g1', 'Ben')
    await model.joinGame('g1', 'Cid')
    await model.leaveGame('g1', 'Ann')
    expect(await valueOf(await model.findPendingGame('g1'))).toMatchObject({
      creator: 'Ben',
      players: ['Ben', 'Cid'],
    })
  })

  it('removes the game when the last player leaves', async () => {
    await model.createGame('Ann', 3)
    expect(await valueOf(await model.leaveGame('g1', 'Ann'))).toBe('g1')
    expect(await model.pendingGames()).toEqual([])
  })

  it('forbids leaving a game one is not waiting in', async () => {
    await model.createGame('Ann', 3)
    expect(await errorOf(await model.leaveGame('g1', 'Ben'))).toEqual({ type: 'Forbidden' })
  })

  it('lets only the creator start early, and only with at least two players', async () => {
    await model.createGame('Ann', 4)
    expect(await errorOf(await model.startPendingGame('g1', 'Ann'))).toEqual({
      type: 'Conflict',
      reason: 'A game needs at least 2 players',
    })
    await model.joinGame('g1', 'Ben')
    expect(await errorOf(await model.startPendingGame('g1', 'Ben'))).toEqual({ type: 'Forbidden' })

    const started = await valueOf(await model.startPendingGame('g1', 'Ann'))
    expect(started?.round.playerCount).toBe(2)
    expect(await model.pendingGames()).toEqual([])
  })
})
