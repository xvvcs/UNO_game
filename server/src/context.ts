import { createGraphQLError } from './graphQLErrors.js'

export type GameContext = { readonly playerName: string | undefined }

export function requirePlayerName({ playerName }: GameContext): string {
  if (playerName === undefined) throw createGraphQLError('Forbidden', 'Forbidden')
  return playerName
}
