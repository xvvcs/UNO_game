// Global game state (Pinia setup store). Single source of truth for the UI.
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { CardColor } from '@domain/model/card'
import { UnoRound, type Round } from '@domain/model/round'
import { createBot, type Bot } from '@/bots/botClient'
import { createBotRunner, type BotRunner } from '@/game/botRunner'
import { playerView } from '@/game/playerView'

export const HUMAN = 0

export type GameSetup = { readonly playerName: string; readonly botCount: 1 | 2 | 3 }

export const useGameStore = defineStore('game', () => {
  const round = shallowRef<Round>()
  // UnoRound mutates itself internally, so Vue can't see changes. Bumping this
  // counter after every action is what makes the computed views below re-run.
  const version = ref(0)
  const botsThinking = ref(false)
  let runner: BotRunner | undefined

  const changed = () => version.value++

  const view = computed(() => {
    void version.value
    return round.value && playerView(round.value, HUMAN)
  })
  const isMyTurn = computed(() => view.value?.playerInTurn === HUMAN)
  const winner = computed(() => {
    void version.value
    return round.value?.winner()
  })

  async function letBotsPlay() {
    if (!runner) return
    botsThinking.value = true
    try {
      await runner.runBots()
    } finally {
      botsThinking.value = false
    }
  }

  function startRound({ playerName, botCount }: GameSetup, makeBot: () => Bot = createBot) {
    runner?.dispose()
    const players = [playerName, ...Array.from({ length: botCount }, (_, i) => `Bot ${i + 1}`)]
    const r = new UnoRound({ players, dealer: Math.floor(Math.random() * players.length) })
    const bots = new Map(players.slice(1).map((_, i) => [i + 1, makeBot()] as const))
    round.value = r
    runner = createBotRunner(r, bots, { onChange: changed })
    changed()
    void letBotsPlay() // a bot might be first
  }

  async function play(cardIndex: number, color?: CardColor, sayUno = false) {
    const r = round.value
    if (!r || !isMyTurn.value || !r.canPlay(cardIndex)) return
    if (sayUno) r.sayUno(HUMAN)
    r.play(cardIndex, color)
    changed()
    await runner?.offerUnoCatch(HUMAN) // the bots may catch you!
    await letBotsPlay()
  }

  async function draw() {
    const r = round.value
    if (!r || !isMyTurn.value) return
    r.draw() // if the drawn card is playable it stays your turn
    changed()
    await letBotsPlay()
  }

  // The human calls out a bot that forgot to say Uno.
  function accuse(accused: number): boolean {
    const r = round.value
    if (!r) return false
    const caught = r.catchUnoFailure({ accuser: HUMAN, accused })
    changed()
    return caught
  }

  function endRound() {
    runner?.dispose()
    runner = undefined
    round.value = undefined
    changed()
  }

  return { view, isMyTurn, winner, botsThinking, startRound, play, draw, accuse, endRound }
})
