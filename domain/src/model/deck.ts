import type { Card } from "./card.js";
import { CARD_COLORS, CARD_NUMBERS, type CardColor, type CardNumber } from "./card.js";
import { standardShuffler, type Shuffler } from "../utils/random_utils.js";

export type { Card, CardColor as Color, Type } from "./card.js";
export { CARD_COLORS as colors, hasColor, hasNumber } from "./card.js";

// Plain, JSON-serialisable snapshot of a Deck's state.
export type DeckMemento = Card[];

// Index 0 is the top of the pile.
export interface Deck {
  deal(): Card | undefined;
  add(cardsToAdd: Card | Card[]): void;
  top(): Card | undefined;
  shuffle(shuffler?: Shuffler<Card>): void;
  filter(predicate: (card: Card) => boolean): Deck;
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

  deal(): Card | undefined {
    return this.cards.shift();
  }
  add(cardsToAdd: Card | Card[]): void {
    if (Array.isArray(cardsToAdd)) {
      this.cards.unshift(...cardsToAdd);
    }
    else {
      this.cards.unshift(cardsToAdd);
    }
  }
  top(): Card | undefined {
    return this.cards[0];
  }
  shuffle(shuffler: Shuffler<Card> = standardShuffler): void {
    shuffler(this.cards);
  }
  filter(predicate: (card: Card) => boolean): Deck {
    const filtered = new UnoDeck(false);
    filtered.add(this.cards.filter(predicate));
    return filtered;
  }
  get size(): number {
    return this.cards.length;
  }
  toMemento(): DeckMemento {
    return [...this.cards];
  }
 
  static fromMemento(memento: readonly Record<string, unknown>[]): UnoDeck {
    const deck = new UnoDeck(false);
    deck.add(memento.map(cardFromMemento));
    return deck;
  }
}

function cardFromMemento(value: Record<string, unknown>): Card {
  const { type, color, number } = value;
  const validColor = CARD_COLORS.includes(color as CardColor);
  const validNumber = CARD_NUMBERS.includes(number as CardNumber);
  switch (type) {
    case "NUMBERED":
      if (validColor && validNumber) return { type, color: color as CardColor, number: number as CardNumber };
      break;
    case "SKIP":
    case "REVERSE":
    case "DRAW":
      if (validColor) return { type, color: color as CardColor };
      break;
    case "WILD":
    case "WILD DRAW":
      return { type };
  }
  throw new Error(`Invalid card in memento: ${JSON.stringify(value)}`);
}
