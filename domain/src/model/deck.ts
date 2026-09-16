import type { Card } from "./card.js";
import { CARD_COLORS, CARD_NUMBERS } from "./card.js";
import { standardShuffler, type Shuffler } from "../utils/random_utils.js";

export type { Card, CardColor as Color, Type } from "./card.js";
export { CARD_COLORS as colors, hasColor, hasNumber } from "./card.js";

// Plain, JSON-serialisable snapshot of a Deck's state.
export interface DeckMemento {
  readonly cards: Card[];
}
export interface Deck {
  draw(): Card | undefined;
  add(cardsToAdd: Card | Card[]): void;
  checkCard(): Card | undefined;
  shuffle(shuffler?: Shuffler<Card>): void;
  toMemento(): DeckMemento;

  readonly size: number;
}

export class UnoDeck implements Deck {
  private cards: Card[] = [];

  constructor(generateFullDeck: boolean = true) {
    if (generateFullDeck) {
      this.cards = this.generateFullDeck();
    } else {
      this.cards = [];
    }
  }

  private generateFullDeck(): Card[] {
    const fullDeck: Card[] = [];
    for (const color of CARD_COLORS) {
      // One zero card for each color
      fullDeck.push({ type: "NUMBERED", color, number: 0 })
      for (const number of CARD_NUMBERS) {
        if (number !== 0) {
          // Two of each number card for each color 1-9 except zero
          fullDeck.push({ type: "NUMBERED", color, number });
          fullDeck.push({ type: "NUMBERED", color, number });
        }
      }
      for (let i = 0; i < 2; i++) {
        // Action cards
        fullDeck.push({ type: "SKIP", color });
        fullDeck.push({ type: "REVERSE", color });
        fullDeck.push({ type: "DRAW", color });
      }
    }
    for (let i = 0; i < 4; i++) {
      // Wild cards
      fullDeck.push({ type: "WILD DRAW" });
      fullDeck.push({ type: "WILD" });
    }
    return fullDeck;
  }

  draw(): Card | undefined {
    return this.cards.pop()
  }
  add(cardsToAdd: Card | Card[]): void {
    if (Array.isArray(cardsToAdd)) {
      this.cards.push(...cardsToAdd);
    }
    else {
      this.cards.push(cardsToAdd);
    }
  }
  checkCard(): Card | undefined {
    return this.cards[this.cards.length - 1];
  }
  shuffle(shuffler: Shuffler<Card> = standardShuffler): void {
    shuffler(this.cards);
  }
  get size(): number {
    return this.cards.length;
  }
  toMemento(): DeckMemento {
    return { cards: [...this.cards] };
  }
 
  static fromMemento(memento: DeckMemento): UnoDeck {
    const deck = new UnoDeck(false);
    deck.add([...memento.cards]);
    return deck;
  }
}
