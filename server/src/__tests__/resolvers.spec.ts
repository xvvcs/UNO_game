import { ApolloServer } from '@apollo/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { GameApi } from '../api.js'
import type { GameContext } from '../context.js'
import { MemoryStore } from '../memoryStore.js'
import { createGameSchema } from '../schema.js'
import { seededGame } from '../seededGame.js'

let server: ApolloServer<GameContext>

beforeEach(async () => {
  const api = new GameApi({ async broadcastGame() {} }, new MemoryStore(seededGame()), () => 0)
  server = new ApolloServer<GameContext>({ schema: await createGameSchema(api) })
})

async function executeAs(playerName: string | undefined, query: string) {
  const response = await server.executeOperation({ query }, { contextValue: { playerName } })
  if (response.body.kind !== 'single') throw new Error('expected a single result')
  return response.body.singleResult
}

const gameQuery = '{ game(id: "0") { players handSizes hand { type color number } } }'

describe('resolvers', () => {
  it('shows the caller only their own hand', async () => {
    const asAlice = await executeAs('Alice', gameQuery)
    expect(asAlice.errors).toBeUndefined()
    expect(asAlice.data?.game).toEqual({
      players: ['Alice', 'Bob'],
      handSizes: [2, 3],
      hand: [
        { type: 'NUMBERED', color: 'RED', number: 5 },
        { type: 'WILD', color: null, number: null },
      ],
    })

    const asBob = await executeAs('Bob', gameQuery)
    expect((asBob.data?.game as { hand: unknown[] }).hand).toHaveLength(3)
  })

  it('hides every hand from strangers and anonymous callers', async () => {
    expect((await executeAs('Eve', gameQuery)).data?.game).toMatchObject({ hand: null })
    expect((await executeAs(undefined, gameQuery)).data?.game).toMatchObject({ hand: null })
  })

  it('returns null for an unknown game', async () => {
    const result = await executeAs('Alice', '{ game(id: "nope") { id } }')
    expect(result.errors).toBeUndefined()
    expect(result.data?.game).toBeNull()
  })

  it('plays a card for the caller', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: 0, sayUno: false) { handSizes playerInTurn } }',
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.playCard).toEqual({ handSizes: [1, 3], playerInTurn: 1 })
  })

  it('accepts a null colour for a number card', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: 0, color: null, sayUno: false) { handSizes } }',
    )
    expect(result.errors).toBeUndefined()
  })

  it('plays a wild card with the chosen colour', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: 1, color: "BLUE", sayUno: false) { currentColor } }',
    )
    expect(result.data?.playCard).toEqual({ currentColor: 'BLUE' })
  })

  it('rejects a colour that is not a card colour', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: 1, color: "PURPLE", sayUno: false) { id } }',
    )
    expect(result.errors?.[0]?.extensions?.code).toBe('Bad Request')
  })

  it('rejects a negative card index', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: -1, sayUno: false) { id } }',
    )
    expect(result.errors?.[0]?.extensions?.code).toBe('Bad Request')
  })

  it('forbids anonymous callers', async () => {
    const result = await executeAs(undefined, 'mutation { drawCard(id: "0") { id } }')
    expect(result.errors?.[0]?.extensions?.code).toBe('Forbidden')
  })

  it('reports out-of-turn moves as Forbidden', async () => {
    const result = await executeAs('Bob', 'mutation { drawCard(id: "0") { id } }')
    expect(result.errors?.[0]?.extensions?.code).toBe('Forbidden')
  })

  it('explains an illegal move', async () => {
    const result = await executeAs(
      'Alice',
      'mutation { playCard(id: "0", cardIndex: 1, sayUno: false) { id } }',
    )
    expect(result.errors?.[0]?.extensions?.code).toBe('Illegal Move')
    expect(result.errors?.[0]?.message).toBe('A wild card needs a colour')
  })

  it('lets a player say UNO and catch an UNO failure', async () => {
    await executeAs('Alice', 'mutation { playCard(id: "0", cardIndex: 0, sayUno: false) { id } }')
    expect((await executeAs('Bob', 'mutation { sayUno(id: "0") { id } }')).errors).toBeUndefined()
    const result = await executeAs(
      'Bob',
      'mutation { catchUnoFailure(id: "0", accused: 0) { handSizes } }',
    )
    expect(result.data?.catchUnoFailure).toEqual({ handSizes: [5, 3] })
  })
})
