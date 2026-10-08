export type PlayDirection = "clockwise" | "counterclockwise";

export class TurnOrder {
  private readonly playerCount: number;
  private currentPlayerIndex: number;
  private directionStep: 1 | -1;

  constructor(playerCount: number, startingPlayer: number, direction: PlayDirection = "clockwise") {
    this.playerCount = playerCount;
    this.currentPlayerIndex = startingPlayer;
    this.directionStep = direction === "clockwise" ? 1 : -1;
  }

  get currentPlayer(): number {
    return this.currentPlayerIndex;
  }

  get direction(): PlayDirection {
    return this.directionStep === 1 ? "clockwise" : "counterclockwise";
  }

  nextPlayer(): number {
    return this.playerStepsAhead(1);
  }

  passTurn(): void {
    this.currentPlayerIndex = this.playerStepsAhead(1);
  }

  skipNextPlayer(): void {
    this.currentPlayerIndex = this.playerStepsAhead(2);
  }

  reverseDirection(): void {
    this.directionStep = this.directionStep === 1 ? -1 : 1;
  }

  private playerStepsAhead(steps: number): number {
    const index = this.currentPlayerIndex + steps * this.directionStep;
    return ((index % this.playerCount) + this.playerCount) % this.playerCount;
  }
}
