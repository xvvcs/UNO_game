import type { Card } from "./card.js";
import { UnoDeck, type Deck, type DeckMemento } from "./deck.js";
import type { Shuffler } from "../utils/random_utils.js";

export class CardPiles {
  readonly drawPile: Deck;
  readonly discardPile: Deck;
  private readonly shuffler: Shuffler<Card>;

  constructor(drawPile: Deck, discardPile: Deck, shuffler: Shuffler<Card>) {
    this.drawPile = drawPile;
    this.discardPile = discardPile;
    this.shuffler = shuffler;
  }

  static shuffledFullDeck(shuffler: Shuffler<Card>): CardPiles {
    const drawPile = new UnoDeck(true);
    drawPile.shuffle(shuffler);
    return new CardPiles(drawPile, new UnoDeck(false), shuffler);
  }

  static fromMemento(drawPile: DeckMemento, discardPile: DeckMemento, shuffler: Shuffler<Card>): CardPiles {
    return new CardPiles(UnoDeck.fromMemento(drawPile), UnoDeck.fromMemento(discardPile), shuffler);
  }

  drawCard(): Card | undefined {
    const card = this.drawPile.deal();
    if (this.drawPile.size === 0) {
      this.reshuffleDiscardIntoDrawPile();
    }
    return card;
  }

  discardCard(card: Card): void {
    this.discardPile.add(card);
  }

  shuffleBackIntoDrawPile(card: Card): void {
    this.drawPile.add(card);
    this.drawPile.shuffle(this.shuffler);
  }

  topOfDiscardPile(): Card {
    const top = this.discardPile.top();
    if (!top) throw new Error("Discard pile is unexpectedly empty");
    return top;
  }

  private reshuffleDiscardIntoDrawPile(): void {
    const top = this.discardPile.deal();
    const rest: Card[] = [];
    let card = this.discardPile.deal();
    while (card) {
      rest.push(card);
      card = this.discardPile.deal();
    }
    if (top) this.discardPile.add(top);
    this.shuffler(rest);
    this.drawPile.add(rest);
  }
}
