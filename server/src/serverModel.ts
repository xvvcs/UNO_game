import type { CardColor } from '@domain/model/card.js'
import { UnoRound, type Round } from '@domain/model/round.js'
import type { Randomizer } from '@domain/utils/random_utils.js'
import { ServerResponse } from './response.js'

export type ActiveGame = {
  readonly id: string
  readonly pending: false
  readonly round: Round
}

export type StoreError = { readonly type: 'Not Found'; readonly key: string }

export type ServerError =
  | StoreError
  | { readonly type: 'Forbidden' }
  | { readonly type: 'Illegal Move'; readonly reason: string }

export type StoreResponse = ServerResponse<ActiveGame, StoreError>

export type MoveResponse = ServerResponse<ActiveGame, ServerError>

export interface GameStore {
  findGame(id: string): Promise<StoreResponse>
  addGame(game: ActiveGame): Promise<StoreResponse>
  updateGame(game: ActiveGame): Promise<StoreResponse>
}

export type PlayMove = {
  readonly cardIndex: number
  readonly color: CardColor | undefined
  readonly sayUno: boolean
}

type WhoMayAct = 'playerInTurn' | 'anyPlayer'

type RoundAction = (round: Round, seat: number) => void

const forbidden: ServerError = { type: 'Forbidden' }

function seatOfPlayer(game: ActiveGame, playerName: string): number {
  const players = Array.from({ length: game.round.playerCount }, (_, seat) =>
    game.round.player(seat),
  )
  return players.indexOf(playerName)
}

function isAllowedToAct(game: ActiveGame, playerName: string, whoMayAct: WhoMayAct): boolean {
  const seat = seatOfPlayer(game, playerName)
  if (seat === -1) return false
  return whoMayAct === 'anyPlayer' || game.round.playerInTurn() === seat
}

function applyToRound(game: ActiveGame, seat: number, action: RoundAction): MoveResponse {
  try {
    action(game.round, seat)
    return ServerResponse.success(game)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return ServerResponse.failure<ServerError>({ type: 'Illegal Move', reason })
  }
}

export class ServerModel {
  private readonly store: GameStore
  private readonly randomizer: Randomizer

  constructor(store: GameStore, randomizer: Randomizer) {
    this.store = store
    this.randomizer = randomizer
  }

  findGame(id: string): Promise<StoreResponse> {
    return this.store.findGame(id)
  }

  startGame(id: string, players: readonly string[]): Promise<StoreResponse> {
    const round = new UnoRound({ players: [...players], dealer: this.randomizer(players.length) })
    return this.store.addGame({ id, pending: false, round })
  }

  playCard(
    id: string,
    playerName: string,
    { cardIndex, color, sayUno }: PlayMove,
  ): Promise<MoveResponse> {
    return this.applyPlayerAction(id, playerName, 'playerInTurn', (round, seat) => {
      if (sayUno) round.sayUno(seat)
      round.play(cardIndex, color)
    })
  }

  drawCard(id: string, playerName: string): Promise<MoveResponse> {
    return this.applyPlayerAction(id, playerName, 'playerInTurn', (round) => {
      round.draw()
    })
  }

  sayUno(id: string, playerName: string): Promise<MoveResponse> {
    return this.applyPlayerAction(id, playerName, 'anyPlayer', (round, seat) => {
      round.sayUno(seat)
    })
  }

  catchUnoFailure(id: string, playerName: string, accused: number): Promise<MoveResponse> {
    return this.applyPlayerAction(id, playerName, 'anyPlayer', (round, seat) => {
      round.catchUnoFailure({ accuser: seat, accused })
    })
  }

  private async applyPlayerAction(
    id: string,
    playerName: string,
    whoMayAct: WhoMayAct,
    action: RoundAction,
  ): Promise<MoveResponse> {
    const found = await this.store.findGame(id)
    const allowed = await found.filter(
      async (game) => isAllowedToAct(game, playerName, whoMayAct),
      async () => forbidden,
    )
    const acted = await allowed.flatMap(async (game) =>
      applyToRound(game, seatOfPlayer(game, playerName), action),
    )
    return acted.flatMap((game) => this.store.updateGame(game))
  }
}
