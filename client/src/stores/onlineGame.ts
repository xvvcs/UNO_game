// Games played against other people through the server. The server is the
// referee: this store only sends moves and keeps the latest state it was sent.
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { CardColor } from '@domain/model/card'
import type { OnlineGame } from '@/api/gameServer'
import { useSessionStore } from './session'

export const useOnlineGameStore = defineStore('onlineGame', () => {
  const session = useSessionStore()
  const games = ref<Record<string, OnlineGame>>({})
  const error = ref('')

  function remember(game: OnlineGame) {
    games.value[game.id] = game
  }

  // Every move by any player in our games arrives here.
  watch(
    () => session.server,
    (server, _, onCleanup) => {
      games.value = {}
      if (server) onCleanup(server.onGameUpdated(remember))
    },
    { immediate: true },
  )

  async function send(action: () => Promise<OnlineGame>): Promise<OnlineGame | undefined> {
    error.value = ''
    try {
      const game = await action()
      remember(game)
      return game
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return undefined
    }
  }

  async function load(id: string) {
    error.value = ''
    try {
      const game = await session.requireServer().game(id)
      if (game) remember(game)
      else error.value = 'This game does not exist'
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  const play = (id: string, cardIndex: number, color: CardColor | undefined, sayUno: boolean) =>
    send(() => session.requireServer().playCard(id, { cardIndex, color, sayUno }))

  const draw = (id: string) => send(() => session.requireServer().drawCard(id))

  const sayUno = (id: string) => send(() => session.requireServer().sayUno(id))

  // True if the accused forgot to say UNO and had to draw.
  async function accuse(id: string, accused: number): Promise<boolean> {
    const before = games.value[id]?.handSizes[accused]
    const after = await send(() => session.requireServer().catchUnoFailure(id, accused))
    return after !== undefined && before !== undefined && after.handSizes[accused]! > before
  }

  return { games, error, remember, load, play, draw, sayUno, accuse }
})
