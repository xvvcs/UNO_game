import { type Card, isSameCard} from "./card.js";

export interface HandMemento {
  readonly cards: Card[];
}

export interface PlayerHand {
  add(cardsToAdd: Card | Card[]): void;
  playCard(cardToPlay: Card): Card | undefined;
  hasCard(cardToCheck: Card): boolean;
  toMemento(): HandMemento;

  readonly size: number;
  readonly cardsInHand: readonly Card[];
}

export class UnoPlayerHand implements PlayerHand {
  private hand: Card[] = []

  constructor(dealtCards: Card[] = []) {
  this.hand = [...dealtCards];
  }

  add(cardsToAdd: Card | Card[]): void {
    if (Array.isArray(cardsToAdd)) {
      this.hand.push(...cardsToAdd);
    }
    else {
      this.hand.push(cardsToAdd);
    }
  }
  playCard(cardToPlay: Card): Card | undefined {
    const index = this.hand.findIndex((c) => isSameCard(c, cardToPlay)); // finds the card index in the hand and performs check if the card is really there
    if (index === -1){
      return undefined; // if selected card is not in hand returns index -1 so undefined
    }
    return this.hand.splice(index, 1)[0]; // returns played card and removes it from hand
  }
  hasCard(cardToCheck: Card): boolean{
    const index = this.hand.findIndex((c) => isSameCard(c, cardToCheck)); 
    return index !== -1;
  }

  get cardsInHand(): readonly Card[]{
    return this.hand
  }

  get size(): number{
    return this.hand.length;
  }
   toMemento(): HandMemento {
    return { cards: [...this.hand] };
  }
 
  static fromMemento(memento: HandMemento): UnoPlayerHand {
    return new UnoPlayerHand([...memento.cards]);
  }
}