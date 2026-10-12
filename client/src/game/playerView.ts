import type { Round } from '@domain/model/round'
import type { PlayerView } from '@/shared/gameTypes'

// What one player is allowed to see: their own hand plus public information.
// Opponents' hands are reduced to their sizes.
export function playerView(round: Round, playerIndex: number): PlayerView {
  const players = Array.from({ length: round.playerCount }, (_, i) => i)
  return {
    playerIndex,
    playerNames: players.map((i) => round.player(i)),
    handSizes: players.map((i) => round.playerHand(i).length),
    playerInTurn: round.playerInTurn(),
    direction: round.toMemento().currentDirection,
    drawPileSize: round.drawPile().size,
    hand: [...round.playerHand(playerIndex)],
    topCard: round.topCard(),
    currentColor: round.currentColor,
  }
}
