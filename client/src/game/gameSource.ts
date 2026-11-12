import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { CardColor } from '@domain/model/card'
import type { PlayDirection } from '@domain/model/turnOrder'
import type { OnlineGame } from '@/api/gameServer'
import type { PlayerView } from '@/shared/gameTypes'
import { HUMAN, useGameStore } from '@/stores/game'
import { useOnlineGameStore } from '@/stores/onlineGame'
import { useSessionStore } from '@/stores/session'
// The server's game, seen from one player's seat.
function toPlayerView(game: OnlineGame, me: string): PlayerView {
  return {
    playerIndex: game.players.indexOf(me),
    playerNames: game.players,
    handSizes: game.handSizes,
    playerInTurn: game.playerInTurn ?? undefined,
    direction: game.direction as PlayDirection,
    drawPileSize: game.drawPileSize,
    hand: game.hand ?? [],
    topCard: game.topCard,
    currentColor: game.currentColor,
  }
}

export function useGameSource() {
  const route = useRoute()
  const local = useGameStore()
  const online = useOnlineGameStore()
  const session = useSessionStore()

  const gameId = computed(() => route.params.gameId as string | undefined)
  const isOnline = computed(() => gameId.value !== undefined)

  const view = computed<PlayerView | undefined>(() => {
    if (!isOnline.value) return local.view
    const game = online.games[gameId.value!]
    return game && session.playerName ? toPlayerView(game, session.playerName) : undefined
  })

  const mySeat = computed(() => (isOnline.value ? (view.value?.playerIndex ?? -1) : HUMAN))
  const isMyTurn = computed(() => view.value?.playerInTurn === mySeat.value)
  const winner = computed(() =>
    isOnline.value ? (online.games[gameId.value!]?.winner ?? undefined) : local.winner,
  )

  const waitingText = computed(() => {
    const v = view.value
    if (!v || isMyTurn.value || winner.value !== undefined) return ''
    if (!isOnline.value) return local.botsThinking ? 'Bots are playing…' : ''
    return v.playerInTurn === undefined ? '' : `Waiting for ${v.playerNames[v.playerInTurn]}…`
  })

  const error = computed(() => (isOnline.value ? online.error : ''))

  async function play(index: number, color: CardColor | undefined, sayUno: boolean) {
    if (isOnline.value) await online.play(gameId.value!, index, color, sayUno)
    else await local.play(index, color, sayUno)
  }
  async function draw() {
    if (isOnline.value) await online.draw(gameId.value!)
    else await local.draw()
  }
  async function accuse(seat: number): Promise<boolean> {
    return isOnline.value ? online.accuse(gameId.value!, seat) : local.accuse(seat)
  }
  function endLocalGame() {
    if (!isOnline.value) local.endRound()
  }

  watch(
    gameId,
    (id) => {
      if (id !== undefined && online.games[id] === undefined) void online.load(id)
    },
    { immediate: true },
  )

  return { view, mySeat, isMyTurn, winner, waitingText, error, play, draw, accuse, endLocalGame }
}