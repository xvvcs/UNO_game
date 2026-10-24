import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useLobbyStore } from '../lobby'
import { useOnlineGameStore } from '../onlineGame'
import { useSessionStore } from '../session'
import { fakeGameServer, onlineGame, pendingGame, type FakeGameServer } from './fakeGameServer'

beforeEach(() => {
  sessionStorage.clear()
  setActivePinia(createPinia())
})

function loginAs(name: string, server: FakeGameServer) {
  const session = useSessionStore()
  session.login(name, () => server)
  return session
}

describe('session', () => {
  it('logs in with a trimmed name and remembers it for the tab', () => {
    const session = loginAs('  Ann ', fakeGameServer())
    expect(session.playerName).toBe('Ann')
    expect(sessionStorage.getItem('uno.playerName')).toBe('Ann')
  })

  it('ignores a blank name', () => {
    const session = useSessionStore()
    session.login('   ', () => fakeGameServer())
    expect(session.isLoggedIn).toBe(false)
  })

  it('closes the connection and forgets the name on logout', () => {
    const server = fakeGameServer()
    const session = loginAs('Ann', server)
    session.logout()
    expect(server.closed).toBe(true)
    expect(session.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem('uno.playerName')).toBeNull()
  })
})

describe('lobby', () => {
  it('lists the open games and follows the updates the server pushes', async () => {
    const server = fakeGameServer({ pendingGames: async () => [pendingGame()] })
    loginAs('Cid', server)
    const lobby = useLobbyStore()
    await flushPromises()
    expect(lobby.pendingGames.map((game) => game.id)).toEqual(['g1'])

    server.pushPendingGames([pendingGame(), pendingGame({ id: 'g2', creator: 'Ben' })])
    expect(lobby.pendingGames).toHaveLength(2)
  })

  it('waits in a game it created', async () => {
    const server = fakeGameServer({ createGame: async () => pendingGame({ numberOfPlayers: 3 }) })
    loginAs('Ann', server)
    const lobby = useLobbyStore()
    await lobby.create(3)
    server.pushPendingGames([pendingGame({ numberOfPlayers: 3 })])
    expect(lobby.waitingIn?.numberOfPlayers).toBe(3)
  })

  it('knows the game started when the join filled the last seat', async () => {
    const server = fakeGameServer({ joinGame: async () => onlineGame() })
    loginAs('Ben', server)
    const lobby = useLobbyStore()
    await lobby.join('g1')
    expect(lobby.startedGameId).toBe('g1')
    expect(useOnlineGameStore().games.g1?.players).toEqual(['Ann', 'Ben'])
  })

  it('knows the game started when another player filled the last seat', async () => {
    const server = fakeGameServer({ createGame: async () => pendingGame() })
    loginAs('Ann', server)
    const lobby = useLobbyStore()
    await lobby.create(2)
    expect(lobby.startedGameId).toBeUndefined()

    server.pushGame(onlineGame())
    server.pushPendingGames([])
    await flushPromises()
    expect(lobby.startedGameId).toBe('g1')
  })

  it('stops waiting after leaving', async () => {
    const server = fakeGameServer({ createGame: async () => pendingGame() })
    loginAs('Ann', server)
    const lobby = useLobbyStore()
    await lobby.create(2)
    await lobby.leave()
    server.pushPendingGames([pendingGame({ creator: 'Ben', players: ['Ben'] })])
    expect(lobby.waitingIn).toBeUndefined()
  })

  it('finds the game it was waiting in after a reload', async () => {
    const server = fakeGameServer({
      pendingGames: async () => [pendingGame({ players: ['Ann', 'Ben'], numberOfPlayers: 3 })],
    })
    loginAs('Ben', server)
    const lobby = useLobbyStore()
    await flushPromises()
    expect(lobby.waitingIn?.id).toBe('g1')
  })

  it('shows why the server refused', async () => {
    const server = fakeGameServer({
      joinGame: () => Promise.reject(new Error('Ann is already waiting for game g1')),
    })
    loginAs('Ann', server)
    const lobby = useLobbyStore()
    await lobby.join('g2')
    expect(lobby.error).toBe('Ann is already waiting for game g1')
  })
})

describe('online game', () => {
  it('keeps the latest state the server pushes', () => {
    const server = fakeGameServer()
    loginAs('Ann', server)
    const online = useOnlineGameStore()
    server.pushGame(onlineGame({ playerInTurn: 1 }))
    expect(online.games.g1?.playerInTurn).toBe(1)
  })

  it('sends a play and keeps the answer', async () => {
    const moves: unknown[] = []
    const server = fakeGameServer({
      async playCard(id, move) {
        moves.push({ id, ...move })
        return onlineGame({ handSizes: [1, 7], playerInTurn: 1 })
      },
    })
    loginAs('Ann', server)
    const online = useOnlineGameStore()
    await online.play('g1', 1, 'BLUE', true)
    expect(moves).toEqual([{ id: 'g1', cardIndex: 1, color: 'BLUE', sayUno: true }])
    expect(online.games.g1?.handSizes).toEqual([1, 7])
  })

  it('shows an illegal move', async () => {
    const server = fakeGameServer({
      drawCard: () => Promise.reject(new Error('Forbidden')),
    })
    loginAs('Ben', server)
    const online = useOnlineGameStore()
    await online.draw('g1')
    expect(online.error).toBe('Forbidden')
  })

  it('tells whether an UNO accusation caught anyone', async () => {
    let handSizes = [1, 7]
    const server = fakeGameServer({ catchUnoFailure: async () => onlineGame({ handSizes }) })
    loginAs('Ben', server)
    const online = useOnlineGameStore()
    online.remember(onlineGame({ handSizes: [1, 7] }))
    expect(await online.accuse('g1', 0)).toBe(false)

    handSizes = [5, 7]
    expect(await online.accuse('g1', 0)).toBe(true)
  })
})
