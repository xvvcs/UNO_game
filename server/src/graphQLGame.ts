import type { Card, CardColor } from '@domain/model/card.js'
import { toGraphQLError } from './graphQLErrors.js'
import type { ActiveGame, MoveResponse, StoreResponse } from './serverModel.js'

export type GraphQLActiveGame = {
  readonly id: string
  readonly pending: false
  readonly players: readonly string[]
  readonly playerInTurn: number | null
  readonly hands: readonly (readonly Card[])[]
  readonly handSizes: readonly number[]
  readonly topCard: Card
  readonly currentColor: CardColor
  readonly direction: string
  readonly drawPileSize: number
  readonly winner: number | null
  readonly score: number | null
}

export function toGraphQLGame({ id, round }: ActiveGame): GraphQLActiveGame {
  const memento = round.toMemento()
  return {
    id,
    pending: false,
    players: memento.players,
    playerInTurn: round.playerInTurn() ?? null,
    hands: memento.hands,
    handSizes: memento.hands.map((hand) => hand.length),
    topCard: round.topCard(),
    currentColor: round.currentColor,
    direction: memento.currentDirection,
    drawPileSize: round.drawPile().size,
    winner: round.winner() ?? null,
    score: round.score() ?? null,
  }
}

export function handOfPlayer(
  game: GraphQLActiveGame,
  playerName: string | undefined,
): readonly Card[] | null {
  const seat = playerName === undefined ? -1 : game.players.indexOf(playerName)
  if (seat === -1) return null
  return game.hands[seat] ?? null
}

export function toGraphQLGameOrThrow(response: MoveResponse): Promise<GraphQLActiveGame> {
  return response.resolve({
    onSuccess: async (game) => toGraphQLGame(game),
    onError: async (error) => {
      throw toGraphQLError(error)
    },
  })
}

export function toGraphQLGameOrNull(response: StoreResponse): Promise<GraphQLActiveGame | null> {
  return response.resolve({
    onSuccess: async (game) => toGraphQLGame(game),
    onError: async () => null,
  })
}
