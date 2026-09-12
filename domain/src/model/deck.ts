import type { Card} from "./card.js";
import { CARD_COLORS, CARD_NUMBERS } from "./card.js";
import { standardRandomizer, standardShuffler } from "../utils/random_utils.js";

export interface Deck {
  draw(): Card | undefined;
  add(cardsToAdd: Card | Card[]): void;
  checkCard(): Card | undefined;
  shuffleDeck(): void;

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
      fullDeck.push({ type: "number", color, value: 0 })
      for (const number of CARD_NUMBERS) {
        if (number !== 0) {
          // Two of each number card for each color 1-9 except zero
          fullDeck.push({ type: "number", color, value: number });
          fullDeck.push({ type: "number", color, value: number });
        }
      }
      for (let i = 0; i < 2; i++) {
        // Action cards
        fullDeck.push({ type: "skip", color });
        fullDeck.push({ type: "reverse", color });
        fullDeck.push({ type: "draw_2", color });
      }
    }
    for (let i = 0; i < 4; i++) {
      // Wild cards
      fullDeck.push({ type: "draw_4" });
      fullDeck.push({ type: "any_color" });
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
  shuffleDeck(): void {
   // Using Olle's randomizer util
   this.cards = standardShuffler(standardRandomizer, this.cards);
  }
  get size(): number {
    return this.cards.length;
  }
}