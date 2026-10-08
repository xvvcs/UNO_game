export class UnoCallTracker {
  private readonly playersWhoSaidUno = new Set<number>();
  private playerOpenToCatch: number | undefined = undefined;

  sayUno(player: number): void {
    this.playersWhoSaidUno.add(player);
  }

  recordPlay(player: number, cardsLeft: number): void {
    this.recordActionBy(player);
    if (cardsLeft === 1) this.playerOpenToCatch = player;
  }

  recordDraw(player: number): void {
    this.recordActionBy(player);
  }

  catchUnoFailure(accused: number): boolean {
    if (accused !== this.playerOpenToCatch || this.playersWhoSaidUno.has(accused)) return false;
    this.playerOpenToCatch = undefined;
    return true;
  }

  private recordActionBy(player: number): void {
    this.playerOpenToCatch = undefined;
    for (const other of this.playersWhoSaidUno) {
      if (other !== player) this.playersWhoSaidUno.delete(other);
    }
  }
}
