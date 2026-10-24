// Drives the bots' turns against the domain Round. The Round stays the referee:
// every move a bot suggests is checked with round.canPlay before it's applied.
import type { CardColor } from '@domain/model/card'
import type { Round } from '@domain/model/round'
import type { Bot } from '@/bots/botClient'
import { bestColor } from '@/bots/botStrategy'
import { playerView } from './playerView'

export type BotRunnerOptions = {
  readonly thinkMs?: number // pause before each bot move, so the human can follow (and catch Uno)
  readonly onChange?: () => void
}

export interface BotRunner {
  runBots(): Promise<void>
  offerUnoCatch(playerWhoPlayed: number): Promise<void>
  dispose(): void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function createBotRunner(
  round: Round,
  bots: ReadonlyMap<number, Bot>,
  { thinkMs = 2000, onChange = () => {} }: BotRunnerOptions = {},
): BotRunner {
  let disposed = false
  let running: Promise<void> | undefined

  // A player who just went down to one card without saying Uno can be caught -
  // but only until the next action. Give each bot a chance, in seat order.
  async function offerUnoCatch(playerWhoPlayed: number) {
    if (round.hasEnded() || round.playerHand(playerWhoPlayed).length !== 1) return
    for (const [index, bot] of bots) {
      if (index === playerWhoPlayed || disposed) continue
      const action = await bot.considerUnoAccusation(playerView(round, index), playerWhoPlayed)
      if (action.type === 'accuse') {
        // false means they did say Uno; either way the question is settled
        round.catchUnoFailure({ accuser: index, accused: action.accused })
        onChange()
        return
      }
    }
  }

  function playCard(
    player: number,
    cardIndex: number,
    color: CardColor | undefined,
    sayUno: boolean,
  ) {
    if (sayUno) round.sayUno(player)
    round.play(cardIndex, color)
    onChange()
  }

  async function playBotTurn(player: number, bot: Bot) {
    const action = await bot.chooseAction(playerView(round, player))
    if (disposed) return

    if (action.type === 'play' && round.canPlay(action.cardIndex)) {
      playCard(player, action.cardIndex, action.color, action.sayUno)
      await offerUnoCatch(player)
      return
    }

    // 'draw', or anything illegal: draw one card. If it can't be played the
    // Round passes the turn on by itself.
    round.draw()
    onChange()
    if (round.playerInTurn() !== player) return

    // The drawn card is playable - ask again, but only the drawn card is allowed now.
    const drawnIndex = round.playerHand(player).length - 1
    const second = await bot.chooseAction(playerView(round, player))
    if (disposed) return
    const hand = round.playerHand(player)
    const drawn = hand[drawnIndex]!
    const isWild = drawn.type === 'WILD' || drawn.type === 'WILD DRAW'
    const fromBot = second.type === 'play' && second.cardIndex === drawnIndex ? second : undefined
    const color = isWild ? (fromBot?.color ?? bestColor(hand, Math.random)) : undefined
    playCard(player, drawnIndex, color, fromBot?.sayUno ?? hand.length === 2)
    await offerUnoCatch(player)
  }

  async function loop() {
    for (;;) {
      const player = round.playerInTurn()
      const bot = player === undefined ? undefined : bots.get(player)
      if (disposed || player === undefined || bot === undefined) return // ended, or human's turn
      await delay(thinkMs)
      if (disposed) return
      await playBotTurn(player, bot)
    }
  }

  return {
    // Safe to call repeatedly - only one loop runs at a time.
    runBots() {
      running ??= loop().finally(() => (running = undefined))
      return running
    },
    offerUnoCatch,
    dispose() {
      disposed = true
      bots.forEach((bot) => bot.terminate())
    },
  }
}
