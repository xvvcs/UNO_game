import { withFilter, type PubSub } from 'graphql-subscriptions'
import type { GameApi } from './api.js'
import { requirePlayerName, type GameContext } from './context.js'
import { gameUpdatedEvent, isUpdateForPlayer, type GameUpdate } from './gameEvents.js'
import {
  handOfPlayer,
  toGraphQLGameOrNull,
  toGraphQLGameOrThrow,
  type GraphQLActiveGame,
} from './graphQLGame.js'
import {
  CatchUnoFailureArguments,
  GameIdArguments,
  PlayCardArguments,
  validateArguments,
} from './validation.js'

type NoParent = unknown

type NoArguments = unknown

export function createResolvers(pubsub: PubSub, api: GameApi) {
  return {
    Query: {
      async game(_: NoParent, args: unknown) {
        const { id } = validateArguments(GameIdArguments, args)
        const response = await api.findGame(id)
        return toGraphQLGameOrNull(response)
      },
    },

    Mutation: {
      async playCard(_: NoParent, args: unknown, context: GameContext) {
        const playerName = requirePlayerName(context)
        const { id, cardIndex, color, sayUno } = validateArguments(PlayCardArguments, args)
        const response = await api.playCard(id, playerName, { cardIndex, color, sayUno })
        return toGraphQLGameOrThrow(response)
      },

      async drawCard(_: NoParent, args: unknown, context: GameContext) {
        const playerName = requirePlayerName(context)
        const { id } = validateArguments(GameIdArguments, args)
        const response = await api.drawCard(id, playerName)
        return toGraphQLGameOrThrow(response)
      },

      async sayUno(_: NoParent, args: unknown, context: GameContext) {
        const playerName = requirePlayerName(context)
        const { id } = validateArguments(GameIdArguments, args)
        const response = await api.sayUno(id, playerName)
        return toGraphQLGameOrThrow(response)
      },

      async catchUnoFailure(_: NoParent, args: unknown, context: GameContext) {
        const playerName = requirePlayerName(context)
        const { id, accused } = validateArguments(CatchUnoFailureArguments, args)
        const response = await api.catchUnoFailure(id, playerName, accused)
        return toGraphQLGameOrThrow(response)
      },
    },

    ActiveGame: {
      hand(game: GraphQLActiveGame, _: NoArguments, context: GameContext) {
        return handOfPlayer(game, context.playerName)
      },
    },

    Subscription: {
      gameUpdated: {
        subscribe: withFilter(
          () => pubsub.asyncIterableIterator([gameUpdatedEvent]),
          (update: GameUpdate | undefined, _: NoArguments, context: GameContext | undefined) =>
            isUpdateForPlayer(update, context),
        ),
      },
    },
  }
}
