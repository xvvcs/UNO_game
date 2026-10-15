// Games waiting for players. The server pushes the whole list on every change.
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { PendingGame } from '@/api/gameServer'
import { useOnlineGameStore } from './onlineGame'
import { useSessionStore } from './session'

export const useLobbyStore = defineStore('lobby', () => {
  const session = useSessionStore()
  const online = useOnlineGameStore()
  const pendingGames = ref<PendingGame[]>([])
  const error = ref('')
  // The game we are waiting in, kept even after it leaves the list so we can
  // tell that it started.
  const waitingForId = ref<string>()

  const waitingIn = computed(() =>
    pendingGames.value.find((game) => game.id === waitingForId.value),
  )
  const startedGameId = computed(() => {
    const id = waitingForId.value
    return id !== undefined && online.games[id] !== undefined ? id : undefined
  })

  async function receive(games: PendingGame[]) {
    pendingGames.value = games
    const id = waitingForId.value
    // Our game left the list: it either started or everybody else left.
    if (id !== undefined && !games.some((game) => game.id === id) && !online.games[id]) {
      const started = await session
        .requireServer()
        .game(id)
        .catch(() => null)
      if (started) online.remember(started)
      else waitingForId.value = undefined
    }
  }

  async function attempt(action: () => Promise<void>) {
    error.value = ''
    try {
      await action()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  const refresh = () =>
    attempt(async () => {
      const games = await session.requireServer().pendingGames()
      pendingGames.value = games
      // After a reload, find the game we were already waiting in.
      const name = session.playerName
      waitingForId.value ??= games.find((game) => name && game.players.includes(name))?.id
    })

  const create = (numberOfPlayers: number) =>
    attempt(async () => {
      const game = await session.requireServer().createGame(numberOfPlayers)
      waitingForId.value = game.id
    })

  const join = (id: string) =>
    attempt(async () => {
      const game = await session.requireServer().joinGame(id)
      if (!game.pending) online.remember(game)
      waitingForId.value = game.id
    })

  const leave = () =>
    attempt(async () => {
      const id = waitingForId.value
      if (id === undefined) return
      await session.requireServer().leaveGame(id)
      waitingForId.value = undefined
    })

  const startNow = () =>
    attempt(async () => {
      const id = waitingForId.value
      if (id === undefined) return
      online.remember(await session.requireServer().startGame(id))
    })

  // Called once the player has gone to the started game.
  function clearStarted() {
    waitingForId.value = undefined
  }

  // Last, so that refresh is defined when the immediate watcher first runs.
  watch(
    () => session.server,
    (server, _, onCleanup) => {
      pendingGames.value = []
      waitingForId.value = undefined
      if (!server) return
      onCleanup(server.onPendingGames((games) => void receive(games)))
      void refresh()
    },
    { immediate: true },
  )

  return {
    pendingGames,
    error,
    waitingIn,
    startedGameId,
    refresh,
    create,
    join,
    leave,
    startNow,
    clearStarted,
  }
})
