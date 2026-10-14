import type { Randomizer } from '@domain/utils/random_utils.js'
import type { ServerResponse } from './response.js'
import {
  ServerModel,
  type ActiveGame,
  type GameStore,
  type PlayMove,
  type ServerError,
  type StoreError,
} from './serverModel.js'

export interface Broadcaster {
  broadcastGame(game: ActiveGame): Promise<void>
}

type StoreResponse = ServerResponse<ActiveGame, StoreError>
type MoveResponse = ServerResponse<ActiveGame, ServerError>

export class GameApi {
  private readonly model: ServerModel
  private readonly broadcaster: Broadcaster

  constructor(broadcaster: Broadcaster, store: GameStore, randomizer: Randomizer) {
    this.model = new ServerModel(store, randomizer)
    this.broadcaster = broadcaster
  }

  findGame(id: string): Promise<StoreResponse> {
    return this.model.findGame(id)
  }

  async startGame(id: string, players: readonly string[]): Promise<StoreResponse> {
    const response = await this.model.startGame(id, players)
    return this.broadcastOnSuccess(response)
  }

  async playCard(id: string, playerName: string, move: PlayMove): Promise<MoveResponse> {
    const response = await this.model.playCard(id, playerName, move)
    return this.broadcastOnSuccess(response)
  }

  async drawCard(id: string, playerName: string): Promise<MoveResponse> {
    const response = await this.model.drawCard(id, playerName)
    return this.broadcastOnSuccess(response)
  }

  async sayUno(id: string, playerName: string): Promise<MoveResponse> {
    const response = await this.model.sayUno(id, playerName)
    return this.broadcastOnSuccess(response)
  }

  async catchUnoFailure(id: string, playerName: string, accused: number): Promise<MoveResponse> {
    const response = await this.model.catchUnoFailure(id, playerName, accused)
    return this.broadcastOnSuccess(response)
  }

  private async broadcastOnSuccess<Failure>(
    response: ServerResponse<ActiveGame, Failure>,
  ): Promise<ServerResponse<ActiveGame, Failure>> {
    await response.process((game) => this.broadcaster.broadcastGame(game))
    return response
  }
}
