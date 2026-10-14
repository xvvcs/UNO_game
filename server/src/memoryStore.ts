import { ServerResponse } from './response.js'
import type { ActiveGame, GameStore, StoreError } from './serverModel.js'

const notFound = (key: string): StoreError => ({ type: 'Not Found', key })

export class MemoryStore implements GameStore {
  private readonly games: Map<string, ActiveGame>

  constructor(...games: ActiveGame[]) {
    this.games = new Map(games.map((game) => [game.id, game]))
  }

  async findGame(id: string): Promise<ServerResponse<ActiveGame, StoreError>> {
    const game = this.games.get(id)
    return game === undefined ? ServerResponse.failure(notFound(id)) : ServerResponse.success(game)
  }

  async addGame(game: ActiveGame): Promise<ServerResponse<ActiveGame, StoreError>> {
    this.games.set(game.id, game)
    return ServerResponse.success(game)
  }

  async updateGame(game: ActiveGame): Promise<ServerResponse<ActiveGame, StoreError>> {
    if (!this.games.has(game.id)) return ServerResponse.failure(notFound(game.id))
    this.games.set(game.id, game)
    return ServerResponse.success(game)
  }
}
