import type { PubSub } from 'graphql-subscriptions'
import type { Broadcaster } from './api.js'
import type { GameContext } from './context.js'
import { toGraphQLGame, type GraphQLActiveGame } from './graphQLGame.js'

export const gameUpdatedEvent = 'GAME_UPDATED'

export type GameUpdate = { readonly gameUpdated: GraphQLActiveGame }

export function createPubSubBroadcaster(pubsub: PubSub): Broadcaster {
  return {
    async broadcastGame(game) {
      const update: GameUpdate = { gameUpdated: toGraphQLGame(game) }
      await pubsub.publish(gameUpdatedEvent, update)
    },
  }
}

export function isUpdateForPlayer(
  update: GameUpdate | undefined,
  context: GameContext | undefined,
): boolean {
  const playerName = context?.playerName
  if (update === undefined || playerName === undefined) return false
  return update.gameUpdated.players.includes(playerName)
}
